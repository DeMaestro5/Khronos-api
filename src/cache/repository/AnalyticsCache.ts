import { Types } from 'mongoose';
import { getJson, setJsonWithTTL, keyExists, flushByPattern } from '../query';
import { DynamicKey, getUserCacheKey, getPlatformCacheKey } from '../keys';
import { OverviewAnalytics, ContentPerformance } from '../../helpers/analytics';
import Logger from '../../core/Logger';

interface CachedAnalytics {
  data: OverviewAnalytics;
  cachedAt: Date;
  expiresAt: Date;
}

interface CachedMetrics {
  data: any;
  cachedAt: Date;
  expiresAt: Date;
}

interface CachedPredictions {
  data: any;
  cachedAt: Date;
  expiresAt: Date;
}

interface CachedContentAnalytics {
  data: ContentPerformance[];
  cachedAt: Date;
  expiresAt: Date;
}

export class AnalyticsCache {
  // Cache TTL values (in seconds)
  private static readonly OVERVIEW_TTL = 5 * 60; // 5 minutes
  private static readonly REAL_TIME_METRICS_TTL = 30; // 30 seconds
  private static readonly PREDICTIONS_TTL = 15 * 60; // 15 minutes
  private static readonly TRENDS_TTL = 10 * 60; // 10 minutes
  private static readonly INSIGHTS_TTL = 20 * 60; // 20 minutes

  /**
   * **Overview Analytics Caching**
   *
   * Why 5 minutes? Overview analytics include aggregated data that doesn't need
   * to be 100% real-time but should be fairly fresh. 5 minutes provides a good
   * balance between performance and data freshness.
   */
  static async getOverviewAnalytics(
    userId: Types.ObjectId,
  ): Promise<OverviewAnalytics | null> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_ANALYTICS, userId.toString());
      const cached = await getJson<CachedAnalytics>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for overview analytics - User: ${userId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for overview analytics - User: ${userId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached overview analytics:', error);
      return null;
    }
  }

  static async setOverviewAnalytics(
    userId: Types.ObjectId,
    data: OverviewAnalytics,
  ): Promise<void> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_ANALYTICS, userId.toString());
      const cachedData: CachedAnalytics = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.OVERVIEW_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.OVERVIEW_TTL);
      Logger.info(`Cached overview analytics for user: ${userId}`);
    } catch (error) {
      Logger.error('Error caching overview analytics:', error);
    }
  }

  /**
   * **Real-time Metrics Caching**
   *
   * Why 30 seconds? Real-time metrics need to be very fresh but we still want
   * some caching to reduce API calls to social media platforms and prevent
   * hitting rate limits.
   */
  static async getRealTimeMetrics(
    contentId: string,
    platform: string,
  ): Promise<any | null> {
    try {
      const key = getUserCacheKey(
        DynamicKey.CONTENT_METRICS,
        `${contentId}_${platform}`,
      );
      const cached = await getJson<CachedMetrics>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for real-time metrics - Content: ${contentId}, Platform: ${platform}`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for real-time metrics - Content: ${contentId}, Platform: ${platform}`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached real-time metrics:', error);
      return null;
    }
  }

  static async setRealTimeMetrics(
    contentId: string,
    platform: string,
    data: any,
  ): Promise<void> {
    try {
      const key = getUserCacheKey(
        DynamicKey.CONTENT_METRICS,
        `${contentId}_${platform}`,
      );
      const cachedData: CachedMetrics = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.REAL_TIME_METRICS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.REAL_TIME_METRICS_TTL);
      Logger.info(
        `Cached real-time metrics for content: ${contentId}, platform: ${platform}`,
      );
    } catch (error) {
      Logger.error('Error caching real-time metrics:', error);
    }
  }

  /**
   * **ML Predictions Caching**
   *
   * Why 15 minutes? ML predictions are computationally expensive to generate
   * but don't change rapidly. 15 minutes allows for good performance while
   * ensuring predictions stay reasonably current.
   */
  static async getPredictions(
    userId: Types.ObjectId,
    contentType: string,
    platform: string,
  ): Promise<any | null> {
    try {
      const key = getUserCacheKey(
        DynamicKey.CONTENT_PREDICTIONS,
        `${userId}_${contentType}_${platform}`,
      );
      const cached = await getJson<CachedPredictions>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(
          `Cache HIT for ML predictions - User: ${userId}, Type: ${contentType}, Platform: ${platform}`,
        );
        return cached.data;
      }

      Logger.info(
        `Cache MISS for ML predictions - User: ${userId}, Type: ${contentType}, Platform: ${platform}`,
      );
      return null;
    } catch (error) {
      Logger.error('Error getting cached ML predictions:', error);
      return null;
    }
  }

  static async setPredictions(
    userId: Types.ObjectId,
    contentType: string,
    platform: string,
    data: any,
  ): Promise<void> {
    try {
      const key = getUserCacheKey(
        DynamicKey.CONTENT_PREDICTIONS,
        `${userId}_${contentType}_${platform}`,
      );
      const cachedData: CachedPredictions = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.PREDICTIONS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.PREDICTIONS_TTL);
      Logger.info(
        `Cached ML predictions for user: ${userId}, type: ${contentType}, platform: ${platform}`,
      );
    } catch (error) {
      Logger.error('Error caching ML predictions:', error);
    }
  }

  /**
   * **Content Analytics Caching**
   *
   * Why 5 minutes? Content analytics include platform-specific performance data
   * that doesn't need to be 100% real-time but should be fairly fresh.
   */
  static async getContentAnalytics(
    contentId: Types.ObjectId,
  ): Promise<ContentPerformance[] | null> {
    try {
      const key = getUserCacheKey(
        DynamicKey.CONTENT_ANALYTICS,
        contentId.toString(),
      );
      const cached = await getJson<CachedContentAnalytics>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for content analytics - Content: ${contentId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for content analytics - Content: ${contentId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached content analytics:', error);
      return null;
    }
  }

  static async setContentAnalytics(
    contentId: Types.ObjectId,
    data: ContentPerformance[],
  ): Promise<void> {
    try {
      const key = getUserCacheKey(
        DynamicKey.CONTENT_ANALYTICS,
        contentId.toString(),
      );
      const cachedData: CachedContentAnalytics = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.OVERVIEW_TTL * 1000), // Use same TTL as overview
      };

      await setJsonWithTTL(key, cachedData, this.OVERVIEW_TTL);
      Logger.info(`Cached content analytics for content: ${contentId}`);
    } catch (error) {
      Logger.error('Error caching content analytics:', error);
    }
  }

  /**
   * **Platform Trends Caching**
   *
   * Why 10 minutes? Trending topics change throughout the day but not every minute.
   * 10 minutes provides fresh trend data while reducing external API calls.
   */
  static async getPlatformTrends(platform: string): Promise<any | null> {
    try {
      const key = getPlatformCacheKey(DynamicKey.PLATFORM_TRENDS, platform);
      const cached = await getJson<CachedMetrics>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for platform trends - Platform: ${platform}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for platform trends - Platform: ${platform}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached platform trends:', error);
      return null;
    }
  }

  static async setPlatformTrends(platform: string, data: any): Promise<void> {
    try {
      const key = getPlatformCacheKey(DynamicKey.PLATFORM_TRENDS, platform);
      const cachedData: CachedMetrics = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.TRENDS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.TRENDS_TTL);
      Logger.info(`Cached platform trends for platform: ${platform}`);
    } catch (error) {
      Logger.error('Error caching platform trends:', error);
    }
  }

  /**
   * **Content Insights Caching**
   *
   * Why 20 minutes? Content insights involve deep analysis that's expensive to compute
   * but relatively stable over short periods.
   */
  static async getContentInsights(contentId: string): Promise<any | null> {
    try {
      const key = getUserCacheKey(DynamicKey.CONTENT_INSIGHTS, contentId);
      const cached = await getJson<CachedMetrics>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for content insights - Content: ${contentId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for content insights - Content: ${contentId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached content insights:', error);
      return null;
    }
  }

  static async setContentInsights(contentId: string, data: any): Promise<void> {
    try {
      const key = getUserCacheKey(DynamicKey.CONTENT_INSIGHTS, contentId);
      const cachedData: CachedMetrics = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.INSIGHTS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.INSIGHTS_TTL);
      Logger.info(`Cached content insights for content: ${contentId}`);
    } catch (error) {
      Logger.error('Error caching content insights:', error);
    }
  }

  /**
   * **Cache Invalidation Methods**
   *
   * These methods handle cache invalidation when data changes
   */
  static async invalidateUserAnalytics(userId: Types.ObjectId): Promise<void> {
    try {
      const pattern = `USER_ANALYTICS_${userId}*`;
      await flushByPattern(pattern);
      Logger.info(`Invalidated analytics cache for user: ${userId}`);
    } catch (error) {
      Logger.error('Error invalidating user analytics cache:', error);
    }
  }

  static async invalidateContentMetrics(contentId: string): Promise<void> {
    try {
      const pattern = `CONTENT_METRICS_${contentId}*`;
      await flushByPattern(pattern);
      Logger.info(
        `Invalidated content metrics cache for content: ${contentId}`,
      );
    } catch (error) {
      Logger.error('Error invalidating content metrics cache:', error);
    }
  }

  static async invalidatePlatformData(platform: string): Promise<void> {
    try {
      const pattern = `PLATFORM_*_${platform}*`;
      await flushByPattern(pattern);
      Logger.info(`Invalidated platform cache for platform: ${platform}`);
    } catch (error) {
      Logger.error('Error invalidating platform cache:', error);
    }
  }

  /**
   * **Cache Statistics and Monitoring**
   */
  static async getCacheStats(): Promise<{
    analytics: number;
    metrics: number;
    predictions: number;
    trends: number;
    insights: number;
  }> {
    try {
      // Count keys for each category (simplified check)
      const analyticsExists = await keyExists(`USER_ANALYTICS_*`);
      const metricsExists = await keyExists(`CONTENT_METRICS_*`);
      const predictionsExists = await keyExists(`CONTENT_PREDICTIONS_*`);
      const trendsExists = await keyExists(`PLATFORM_TRENDS_*`);
      const insightsExists = await keyExists(`CONTENT_INSIGHTS_*`);

      return {
        analytics: analyticsExists ? 1 : 0,
        metrics: metricsExists ? 1 : 0,
        predictions: predictionsExists ? 1 : 0,
        trends: trendsExists ? 1 : 0,
        insights: insightsExists ? 1 : 0,
      };
    } catch (error) {
      Logger.error('Error getting cache stats:', error);
      return {
        analytics: 0,
        metrics: 0,
        predictions: 0,
        trends: 0,
        insights: 0,
      };
    }
  }
}
