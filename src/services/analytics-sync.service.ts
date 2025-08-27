import { Types } from 'mongoose';
import { UserSocialService } from './user-social.service';
import ContentRepo from '../database/repository/ContentRepo';
import RateLimiter from './rate-limiter';
import Logger from '../core/Logger';
import axios from 'axios';

type SyncPlatform =
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'twitter';

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
  includePlatforms: [
    'youtube',
    'facebook',
    'instagram',
    'tiktok',
    'linkedin',
    'twitter',
  ],
};

// prevent multiple syncs for the same user from running at the same time
const syncingUserIds = new Set<string>();

// rate limiters for each platform
const globalMetricsLimiters: Record<SyncPlatform, RateLimiter> = {
  youtube: new RateLimiter(8),
  facebook: new RateLimiter(6),
  instagram: new RateLimiter(6),
  tiktok: new RateLimiter(4),
  linkedin: new RateLimiter(8),
  twitter: new RateLimiter(8),
};

// sleep for a given number of milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// retry a function with a given number of retries, base delay, and jitter
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

// chunk an array into smaller arrays of a given size
function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return [array];
  const output: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    output.push(array.slice(i, i + size));
  }
  return output;
}

// coerce metrics to a valid MetricsPayload
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

// run a function with a given number of items in parallel
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

// analytics sync service
export class AnalyticsSyncService {
  private social: UserSocialService;

  constructor() {
    this.social = new UserSocialService();
  }

  // process platform work
  private async processPlatformWork(
    workItems: WorkItem[],
    platform: SyncPlatform,
    userId: Types.ObjectId,
    options: SyncOptions,
    resultMap: Map<string, MetricsPayload>,
    failures: SyncResult['failures'],
  ): Promise<void> {
    if (workItems.length === 0) return;

    await runWithConcurrency(workItems, options.concurrency, async (w) => {
      const began = Date.now();
      try {
        const metrics = await withRetry(
          () =>
            globalMetricsLimiters[platform].add(async () => {
              switch (platform) {
                case 'youtube':
                  return this.social.getYoutubeMetricsForUser(userId, w.postId);
                case 'facebook':
                  return this.social.getFacebookMetricsForUser(
                    userId,
                    w.postId,
                  );
                case 'instagram':
                  return this.social.getInstagramMetricsForUser(
                    userId,
                    w.postId,
                  );
                case 'tiktok':
                  return this.social.getTikTokMetricsForUser(userId, w.postId);
                case 'linkedin':
                  return this.social.getLinkedInMetricsForUser(
                    userId,
                    w.postId,
                  );
                case 'twitter':
                  return this.social.getTwitterMetricsForUser(userId, w.postId);
                default:
                  throw new Error(`unknown_platform: ${platform}`);
              }
            }),
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

        resultMap.set(`${platform}:${w.postId}`, coerced);
        Logger.debug(
          `sync_platform_success platform=${platform} contentId=${
            w.contentId
          } postId=${w.postId} durationMs=${Date.now() - began}`,
        );
      } catch (error: any) {
        Logger.warn(
          `sync_platform_fail platform=${platform} contentId=${
            w.contentId
          } postId=${w.postId} durationMs=${Date.now() - began} error=${
            error?.message || error
          }`,
        );
        failures.push({
          index: w.index,
          contentId: w.contentId.toString(),
          platform: platform,
          reason: error?.message || error,
        });
      }
    });
  }

  // sync a user
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

      const resultMap = new Map<string, MetricsPayload>();
      const ytWork = work.filter((w) => w.platform === 'youtube');
      const fbWork = work.filter((w) => w.platform === 'facebook');
      const igWork = work.filter((w) => w.platform === 'instagram');
      const ttWork = work.filter((w) => w.platform === 'tiktok');
      const liWork = work.filter((w) => w.platform === 'linkedin');
      const twWork = work.filter((w) => w.platform === 'twitter');

      const ytResultMap = await this.fetchYoutubeBatches(ytWork, options);
      for (const [k, v] of ytResultMap.entries())
        resultMap.set(`youtube:${k}`, v);

      const failures: SyncResult['failures'] = [];

      if (options.includePlatforms.includes('youtube') && ytWork.length > 0) {
        await this.processPlatformWork(
          ytWork,
          'youtube',
          userId,
          options,
          resultMap,
          failures,
        );
      }

      if (options.includePlatforms.includes('facebook') && fbWork.length > 0) {
        await this.processPlatformWork(
          fbWork,
          'facebook',
          userId,
          options,
          resultMap,
          failures,
        );
      }

      if (options.includePlatforms.includes('instagram') && igWork.length > 0) {
        await this.processPlatformWork(
          igWork,
          'instagram',
          userId,
          options,
          resultMap,
          failures,
        );
      }

      if (options.includePlatforms.includes('tiktok') && ttWork.length > 0) {
        await this.processPlatformWork(
          ttWork,
          'tiktok',
          userId,
          options,
          resultMap,
          failures,
        );
      }

      if (options.includePlatforms.includes('linkedin') && liWork.length > 0) {
        await this.processPlatformWork(
          liWork,
          'linkedin',
          userId,
          options,
          resultMap,
          failures,
        );
      }

      if (options.includePlatforms.includes('twitter') && twWork.length > 0) {
        await this.processPlatformWork(
          twWork,
          'twitter',
          userId,
          options,
          resultMap,
          failures,
        );
      }

      const allWork = [
        ...(options.includePlatforms.includes('youtube') ? ytWork : []),
        ...(options.includePlatforms.includes('facebook') ? fbWork : []),
        ...(options.includePlatforms.includes('instagram') ? igWork : []),
        ...(options.includePlatforms.includes('tiktok') ? ttWork : []),
        ...(options.includePlatforms.includes('linkedin') ? liWork : []),
        ...(options.includePlatforms.includes('twitter') ? twWork : []),
      ];

      const missing = allWork.filter(
        (w) => !resultMap.has(`${w.platform}:${w.postId}`),
      );
      for (const miss of missing) {
        failures.push({
          index: miss.index,
          contentId: miss.contentId.toString(),
          platform: miss.platform,
          reason: 'metrics_not_available',
        });
      }

      const ops = allWork
        .map((w) => {
          const key = `${w.platform}:${w.postId}`;
          const m = resultMap.get(key);
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

      const attempted = allWork.length;
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
        failures,
        durationMs,
      };
    } finally {
      syncingUserIds.delete(userKey);
    }
  }

  // fetch youtube batches
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
