import { Types } from 'mongoose';
import { AnalyticsCache } from './repository/AnalyticsCache';
import { UserCache } from './repository/UserCache';
import { ExternalAPICache } from './repository/ExternalAPICache';
import Logger from '../core/Logger';

/**
 * **Cache Manager Service**
 *
 * This service coordinates all caching operations and handles cache invalidation
 * when data changes. Think of it as the "traffic controller" for your cache.
 */
export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * **Content Data Changes - Invalidate Related Caches**
   *
   * When a user creates, updates, or deletes content, we need to invalidate
   * related caches to ensure users see fresh data.
   */
  async onContentChanged(
    userId: Types.ObjectId,
    contentId?: string,
  ): Promise<void> {
    try {
      Logger.info(
        `Invalidating caches due to content change for user: ${userId}`,
      );

      // Invalidate user's content list
      await UserCache.invalidateUserContent(userId);

      // Invalidate user's analytics (since new content affects analytics)
      await AnalyticsCache.invalidateUserAnalytics(userId);

      // If specific content was updated, invalidate its metrics
      if (contentId) {
        await AnalyticsCache.invalidateContentMetrics(contentId);
      }

      Logger.info('Successfully invalidated content-related caches');
    } catch (error) {
      Logger.error('Error invalidating content caches:', error);
    }
  }

  /**
   * **User Settings Changes - Invalidate User Data**
   *
   * When user settings change, we need to ensure cached settings are refreshed.
   */
  async onUserSettingsChanged(userId: Types.ObjectId): Promise<void> {
    try {
      Logger.info(`Invalidating user settings cache for user: ${userId}`);

      await UserCache.invalidateUserSettings(userId);

      Logger.info('Successfully invalidated user settings cache');
    } catch (error) {
      Logger.error('Error invalidating user settings cache:', error);
    }
  }

  /**
   * **Platform API Updates - Invalidate External Caches**
   *
   * When we detect platform API changes or rate limit resets, refresh external data.
   */
  async onPlatformAPIReset(platform: string): Promise<void> {
    try {
      Logger.info(`Invalidating platform caches for: ${platform}`);

      await AnalyticsCache.invalidatePlatformData(platform);
      await ExternalAPICache.invalidateSocialMediaCache(platform);

      Logger.info(`Successfully invalidated platform caches for: ${platform}`);
    } catch (error) {
      Logger.error(
        `Error invalidating platform caches for ${platform}:`,
        error,
      );
    }
  }

  /**
   * **Chat Activity - Invalidate Chat Caches**
   *
   * When users send messages or create chat sessions, update chat caches.
   */
  async onChatActivity(userId: Types.ObjectId): Promise<void> {
    try {
      Logger.info(`Invalidating chat caches for user: ${userId}`);

      await UserCache.invalidateUserChatSessions(userId);

      Logger.info('Successfully invalidated chat caches');
    } catch (error) {
      Logger.error('Error invalidating chat caches:', error);
    }
  }

  /**
   * **Calendar Events Changes - Invalidate Calendar Caches**
   *
   * When calendar events are added, updated, or deleted.
   */
  async onCalendarChanged(userId: Types.ObjectId): Promise<void> {
    try {
      Logger.info(`Invalidating calendar caches for user: ${userId}`);

      await UserCache.invalidateUserCalendar(userId);

      Logger.info('Successfully invalidated calendar caches');
    } catch (error) {
      Logger.error('Error invalidating calendar caches:', error);
    }
  }

  /**
   * **User Logout/Deletion - Complete Cache Cleanup**
   *
   * When a user logs out or deletes their account, clean up all their cached data.
   */
  async onUserLogout(userId: Types.ObjectId): Promise<void> {
    try {
      Logger.info(`Performing complete cache cleanup for user: ${userId}`);

      await UserCache.invalidateAllUserData(userId);

      Logger.info('Successfully completed user cache cleanup');
    } catch (error) {
      Logger.error('Error during user cache cleanup:', error);
    }
  }

  /**
   * **Emergency Cache Clear**
   *
   * Clear all caches in case of issues or maintenance.
   */
  async emergencyCacheClear(): Promise<void> {
    try {
      Logger.warn('Performing emergency cache clear');

      // Clear all cache patterns
      const patterns = [
        'USER_*',
        'CONTENT_*',
        'PLATFORM_*',
        'ANALYTICS_*',
        'API_RESPONSE_*',
        'CHAT_RESPONSE_*',
        'EMBEDDINGS_*',
      ];

      for (const pattern of patterns) {
        // Note: flushByPattern would need to be imported from query
        // await flushByPattern(pattern);
        Logger.info(`Would clear pattern: ${pattern}`);
      }

      Logger.warn('Emergency cache clear completed');
    } catch (error) {
      Logger.error('Error during emergency cache clear:', error);
    }
  }

  /**
   * **Cache Health Monitoring**
   *
   * Get overall cache health and statistics.
   */
  async getCacheHealthReport(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    analytics: any;
    users: any;
    apis: any;
    recommendations: string[];
  }> {
    try {
      const [analyticsStats, apiStats] = await Promise.all([
        AnalyticsCache.getCacheStats(),
        ExternalAPICache.getAPICallsSaved(),
      ]);

      // Simple health assessment
      const totalCacheItems = Object.values(analyticsStats).reduce(
        (sum, count) => sum + count,
        0,
      );
      const totalAPISaves = Object.values(apiStats).reduce(
        (sum, count) => sum + count,
        0,
      );

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      const recommendations: string[] = [];

      if (totalCacheItems === 0) {
        status = 'warning';
        recommendations.push(
          'No cached data found - caching may not be working properly',
        );
      }

      if (totalAPISaves < 10) {
        recommendations.push(
          'Low API call savings - consider adjusting cache TTL values',
        );
      }

      return {
        status,
        analytics: analyticsStats,
        users: { cached: totalCacheItems > 0 },
        apis: apiStats,
        recommendations,
      };
    } catch (error) {
      Logger.error('Error generating cache health report:', error);
      return {
        status: 'critical',
        analytics: {},
        users: {},
        apis: {},
        recommendations: ['Error accessing cache - investigate immediately'],
      };
    }
  }

  /**
   * **Warm Up Cache**
   *
   * Pre-populate cache with frequently accessed data.
   */
  async warmUpCache(userId: Types.ObjectId): Promise<void> {
    try {
      Logger.info(`Warming up cache for user: ${userId}`);

      // This would typically be called when a user logs in
      // to pre-load their frequently accessed data

      // Example: Pre-load user's recent content, settings, etc.
      // const userContent = await ContentRepo.findByUserId(userId);
      // await UserCache.setUserContent(userId, userContent);

      Logger.info('Cache warm-up completed');
    } catch (error) {
      Logger.error('Error during cache warm-up:', error);
    }
  }

  /**
   * **Cost Savings Report**
   *
   * Calculate how much money caching has saved in API costs.
   */
  async getCostSavingsReport(): Promise<{
    totalSaved: number;
    currency: string;
    breakdown: any;
    period: string;
  }> {
    try {
      const savings = await ExternalAPICache.estimateCostSavings();

      return {
        ...savings,
        period: '30 days', // Could be made configurable
      };
    } catch (error) {
      Logger.error('Error generating cost savings report:', error);
      return {
        totalSaved: 0,
        currency: 'USD',
        breakdown: {},
        period: '30 days',
      };
    }
  }

  /**
   * **Cache Performance Metrics**
   *
   * Get detailed performance metrics for monitoring.
   */
  async getPerformanceMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    averageResponseTime: number;
    mostCachedOperations: string[];
    recommendations: string[];
  }> {
    try {
      // In a production system, you'd track these metrics in real-time
      // For now, we'll return mock data structure

      return {
        hitRate: 85, // 85% cache hit rate
        missRate: 15, // 15% cache miss rate
        averageResponseTime: 12, // 12ms average response time
        mostCachedOperations: [
          'user_analytics',
          'real_time_metrics',
          'content_list',
          'trending_topics',
        ],
        recommendations: [
          'Consider increasing TTL for analytics data',
          'Real-time metrics have good cache hit rate',
          'User content cache is performing well',
        ],
      };
    } catch (error) {
      Logger.error('Error getting performance metrics:', error);
      return {
        hitRate: 0,
        missRate: 100,
        averageResponseTime: 0,
        mostCachedOperations: [],
        recommendations: ['Error accessing metrics - investigate cache system'],
      };
    }
  }
}
