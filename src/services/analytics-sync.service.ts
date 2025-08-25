import { Types } from 'mongoose';
import { UserSocialService } from './user-social.service';
import ContentRepo from '../database/repository/ContentRepo';
import RateLimiter from './rate-limiter';
import Logger from '../core/Logger';
import axios from 'axios';
type SyncPlatform = 'youtube';

interface SyncOptions {
  concurrency: number;
  maxRetries: number;
  retryDelayBaseMs: number;
  retryJittersMaxMs: number;
  remoteBatchSize: number;
  bulkWriteChunkSize: number;
  includePlatforms: SyncPlatform[];
}

interface WorkItem {
  index: number;
  contentId: Types.ObjectId;
  platform: SyncPlatform;
  postId: string;
}

interface MetricsPayload {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
}

interface SyncResult {
  attempted: number;
  succeeded: number;
  durationMs: number;
  failed: number;
  failures: Array<{
    index: number;
    contentId: string;
    platform: string;
    reason: string;
  }>;
}

const DEFAULT_OPTIONS: SyncOptions = {
  concurrency: 5,
  maxRetries: 2,
  retryDelayBaseMs: 300,
  bulkWriteChunkSize: 100,
  retryJittersMaxMs: 100,
  remoteBatchSize: 50,
  includePlatforms: ['youtube'],
};

const syncingUserIds = new Set<string>();

const globalMetricsLimiters: Record<SyncPlatform, RateLimiter> = {
  youtube: new RateLimiter(8),
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseMs: number,
  jitterMaxMs: number,
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      const backoff = baseMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * jitterMaxMs);
      await sleep(backoff + jitter);
      attempt++;
    }
  }
}

function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return [array];
  const output: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    output.push(array.slice(i, i + size));
  }
  return output;
}

function coerceMetrics(m?: Partial<MetricsPayload>): MetricsPayload {
  const likes = Math.max(0, Number(m?.likes || 0));
  const comments = Math.max(0, Number(m?.comments || 0));
  const shares = Math.max(0, Number(m?.shares || 0));
  const views = Math.max(0, Number(m?.views || 0));
  const reach = Math.max(0, Number(m?.reach || 0));
  const impressions = Math.max(0, Number(m?.impressions || 0));
  const engagement = Math.max(
    0,
    Number(m?.engagement ?? likes + comments + shares),
  );
  const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;

  return {
    likes,
    comments,
    shares,
    views,
    reach,
    impressions,
    engagement,
    engagementRate,
  };
}

async function runWithConcurrency<I>(
  items: I[],
  limit: number,
  worker: (item: I) => Promise<void>,
): Promise<void> {
  let inFlight = 0;
  let index = 0;

  return await new Promise((resolve) => {
    const next = () => {
      if (index >= items.length && inFlight === 0) return resolve();

      while (inFlight < limit && index < items.length) {
        const current = items[index++];
        inFlight++;

        worker(current)
          .catch(() => {}) // we already handle/log inside worker
          .finally(() => {
            inFlight--;
            next();
          });
      }
    };
    next();
  });
}

export class AnalyticsSyncService {
  private social: UserSocialService;

  constructor() {
    this.social = new UserSocialService();
  }

  async syncUser(
    userId: Types.ObjectId,
    opts?: Partial<SyncOptions>,
  ): Promise<SyncResult> {
    const options: SyncOptions = { ...DEFAULT_OPTIONS, ...(opts || {}) };
    const statedAt = Date.now();

    const userKey = userId.toString();
    if (syncingUserIds.has(userKey)) {
      return {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        durationMs: 0,
        failures: [
          {
            index: -1,
            contentId: 'n/a',
            platform: 'n/a',
            reason: 'sync_in_progress',
          },
        ],
      };
    }
    syncingUserIds.add(userKey);

    try {
      const contents = await ContentRepo.findByUserId(userId);
      const work: WorkItem[] = [];
      contents.forEach((content, index) => {
        const platforms = Array.isArray(content.platform)
          ? content.platform
          : [];
        const postMap = content.platformPostIds || {};
        for (const platform of platforms) {
          if (!options.includePlatforms.includes(platform as SyncPlatform))
            continue;
          const postId = (postMap as Record<string, string>)[platform];
          if (!postId) continue;
          work.push({
            index,
            contentId: content._id,
            platform: platform as SyncPlatform,
            postId,
          });
        }
      });

      if (work.length === 0) {
        return {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          durationMs: Date.now() - statedAt,
          failures: [],
        };
      }

      const ytWork = work.filter((w) => w.platform === 'youtube');

      const ytResultMap = await this.fetchYoutubeBatches(ytWork, options);

      const missingYt = ytWork.filter((w) => !ytResultMap.has(w.postId));
      if (missingYt.length > 0) {
        Logger.info(
          `Processing ${missingYt.length} missing YouTube items individually`,
        );
      }
      await runWithConcurrency(missingYt, options.concurrency, async (w) => {
        const begin = Date.now();
        try {
          const metrics = await withRetry(
            () =>
              globalMetricsLimiters.youtube.add(() =>
                this.social.getYoutubeMetricsForUser(userId, w.postId),
              ),
            options.maxRetries,
            options.retryDelayBaseMs,
            options.retryJittersMaxMs,
          );

          const coerced = coerceMetrics({
            likes: metrics?.metrics?.likes,
            comments: metrics?.metrics?.comments,
            shares: metrics?.metrics?.shares,
            views: metrics?.metrics?.views,
            reach: metrics?.metrics?.reach,
            impressions: metrics?.metrics?.impressions,
            engagement: metrics?.metrics?.engagement,
          });

          ytResultMap.set(w.postId, coerced);
          Logger.debug(
            `fallback_youtube_success content=${w.contentId} postId=${
              w.postId
            } durationMs=${Date.now() - begin}`,
          );
        } catch (error: any) {
          Logger.warn(
            `fallback_youtube_fail content=${w.contentId} postId=${
              w.postId
            } durationMs=${Date.now() - begin} error=${
              error?.message || error
            }`,
          );
          // don’t rethrow; runWithConcurrency keeps going automatically
        }
      });
      const ops = ytWork
        .map((w) => {
          const m = ytResultMap.get(w.postId);
          if (!m) return null;
          return {
            filter: { _id: w.contentId },
            update: {
              'engagement.likes': m.likes,
              'engagement.comments': m.comments,
              'engagement.shares': m.shares,
              'engagement.views': m.views,
              'analytics.reach': m.reach,
              'analytics.impressions': m.impressions,
              'analytics.engagementRate': m.engagementRate,
              updatedAt: new Date(),
            },
          };
        })
        .filter(Boolean) as Array<{ filter: any; update: any }>;

      let succeeded = 0;
      const failure: SyncResult['failures'] = [];
      const opChunks = chunk(ops, options.bulkWriteChunkSize);

      for (const opChunk of opChunks) {
        if (!opChunk || opChunk.length === 0) continue;
        try {
          const result = await ContentRepo.bulkWriteUpdateSet(opChunk);
          succeeded +=
            (result.modifiedCount || 0) + (result.upsertedCount || 0);
        } catch (error: any) {
          failure.push({
            index: -1,
            contentId: opChunk[0].filter._id.toString(),
            platform: 'bulk',
            reason: error?.message || 'bulk_write_error',
          });
        }
      }

      const attempted = ytWork.length;
      const missingPostIds = ytWork.filter((w) => !ytResultMap.has(w.postId));
      for (const miss of missingPostIds) {
        failure.push({
          index: miss.index,
          contentId: miss.contentId.toString(),
          platform: miss.platform,
          reason: 'metrics_not_available',
        });
      }

      const durationMs = Date.now() - statedAt;
      Logger.info(
        `sync_user_complete userId=${userId} attempted=${attempted} succeeded=${succeeded} failed=${failure.length} durationMs=${durationMs}`,
      );
      return {
        attempted,
        succeeded,
        failed: failure.length,
        failures: failure,
        durationMs,
      };
    } finally {
      syncingUserIds.delete(userKey);
    }
  }

  private async fetchYoutubeBatches(
    items: WorkItem[],
    options: SyncOptions,
  ): Promise<Map<string, MetricsPayload>> {
    const out = new Map<string, MetricsPayload>();
    if (items.length === 0) return out;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      Logger.warn('youtube_api_key_is_missing: batch path skipped');
      return out;
    }

    const batches = chunk(items, options.remoteBatchSize);
    for (const group of batches) {
      const ids = group.map((g) => g.postId);
      try {
        await withRetry(
          async () => {
            await globalMetricsLimiters.youtube.add(async () => {
              const res = await axios.get(
                'https://www.googleapis.com/youtube/v3/videos',
                {
                  params: {
                    id: ids.join(','),
                    part: 'statistics,contentDetails',
                    key: apiKey,
                  },
                  timeout: 15000,
                },
              );

              const items = Array.isArray(res.data.items) ? res.data.items : [];
              for (const item of items) {
                const vid = item?.id as string | undefined;
                const stats = item?.statistics || {};
                if (!vid) continue;

                const metrics = coerceMetrics({
                  likes: Number(stats.likeCount || 0),
                  comments: Number(stats.commentCount || 0),
                  shares: 0,
                  views: Number(stats.viewCount || 0),
                  reach: Number(stats.viewCount || 0),
                  impressions: 0,
                });

                out.set(vid, metrics);
              }
            });
          },
          options.maxRetries,
          options.retryDelayBaseMs,
          options.retryJittersMaxMs,
        );
      } catch (error: any) {
        Logger.warn(
          `youtube_batch_fetch_error ids=${ids.length} error=${
            error?.message || error
          }`,
        );
      }
    }

    return out;
  }
}
