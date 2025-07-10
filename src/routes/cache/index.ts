import express from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { CacheManager } from '../../cache/CacheManager';
import { AnalyticsCache } from '../../cache/repository/AnalyticsCache';
import { UserCache } from '../../cache/repository/UserCache';
import { ExternalAPICache } from '../../cache/repository/ExternalAPICache';
import { ProtectedRequest } from '../../types/app-request';
import asyncHandler from '../../helpers/asyncHandler';
import authentication from '../../auth/authentication';

const router = express.Router();

// =============================================================================
// PUBLIC ENDPOINTS (No Authentication Required) - For Operational Monitoring
// =============================================================================

/**
 * **Cache Health Monitoring**
 *
 * GET /api/v1/cache/health
 *
 * Get overall cache health and statistics. This is useful for monitoring
 * your cache performance and ensuring it's working correctly.
 * NO AUTHENTICATION REQUIRED - for operational monitoring
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const cacheManager = CacheManager.getInstance();
    const healthReport = await cacheManager.getCacheHealthReport();

    new SuccessResponse(
      'Cache health report retrieved successfully',
      healthReport,
    ).send(res);
  }),
);

/**
 * **Cache Performance Metrics**
 *
 * GET /api/v1/cache/metrics
 *
 * Get detailed cache performance metrics including hit rates, response times,
 * and optimization recommendations.
 * NO AUTHENTICATION REQUIRED - for operational monitoring
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const cacheManager = CacheManager.getInstance();
    const metrics = await cacheManager.getPerformanceMetrics();

    new SuccessResponse(
      'Cache performance metrics retrieved successfully',
      metrics,
    ).send(res);
  }),
);

/**
 * **Cost Savings Report**
 *
 * GET /api/v1/cache/savings
 *
 * See how much money caching has saved by reducing external API calls.
 * This helps justify the caching infrastructure investment.
 * NO AUTHENTICATION REQUIRED - for operational monitoring
 */
router.get(
  '/savings',
  asyncHandler(async (req, res) => {
    const cacheManager = CacheManager.getInstance();
    const savings = await cacheManager.getCostSavingsReport();

    new SuccessResponse(
      'Cost savings report retrieved successfully',
      savings,
    ).send(res);
  }),
);

// =============================================================================
// PROTECTED ENDPOINTS (Authentication Required) - User & Admin Operations
// =============================================================================

// Apply authentication to all routes below this point
router.use(authentication);

/**
 * **User Cache Status**
 *
 * GET /api/v1/cache/user/status
 *
 * Check what data is currently cached for the authenticated user.
 * Useful for debugging and understanding cache coverage.
 */
router.get(
  '/user/status',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const userId = req.user._id;
    const cacheHealth = await UserCache.getCacheHealth(userId);

    new SuccessResponse(
      'User cache status retrieved successfully',
      cacheHealth,
    ).send(res);
  }),
);

/**
 * **Invalidate User Analytics Cache**
 *
 * DELETE /api/v1/cache/user/analytics
 *
 * Manually invalidate user's analytics cache. Useful when you want to force
 * fresh analytics data (e.g., after making data corrections).
 */
router.delete(
  '/user/analytics',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const userId = req.user._id;
    await AnalyticsCache.invalidateUserAnalytics(userId);

    new SuccessResponse(
      'User analytics cache invalidated successfully',
      {},
    ).send(res);
  }),
);

/**
 * **Invalidate User Content Cache**
 *
 * DELETE /api/v1/cache/user/content
 *
 * Manually invalidate user's content cache. Use this when content has been
 * updated outside the normal flow.
 */
router.delete(
  '/user/content',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const userId = req.user._id;
    await UserCache.invalidateUserContent(userId);

    new SuccessResponse('User content cache invalidated successfully', {}).send(
      res,
    );
  }),
);

/**
 * **Invalidate Platform Cache**
 *
 * DELETE /api/v1/cache/platform/:platform
 *
 * Invalidate all cached data for a specific platform. Use this when you know
 * a platform's data has changed significantly.
 */
router.delete(
  '/platform/:platform',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { platform } = req.params;
    const cacheManager = CacheManager.getInstance();
    await cacheManager.onPlatformAPIReset(platform);

    new SuccessResponse(
      `Platform cache for ${platform} invalidated successfully`,
      {},
    ).send(res);
  }),
);

/**
 * **Warm Up User Cache**
 *
 * POST /api/v1/cache/user/warmup
 *
 * Pre-populate cache with user's frequently accessed data. This is useful
 * to call after user login to improve their initial experience.
 */
router.post(
  '/user/warmup',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const userId = req.user._id;
    const cacheManager = CacheManager.getInstance();
    await cacheManager.warmUpCache(userId);

    new SuccessResponse('User cache warmed up successfully', {}).send(res);
  }),
);

/**
 * **Test Cache Performance**
 *
 * GET /api/v1/cache/test/analytics
 *
 * Test the analytics cache by making the same request twice and comparing
 * response times. This demonstrates cache effectiveness.
 */
router.get(
  '/test/analytics',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const userId = req.user._id;

    // First request (cache miss)
    const start1 = Date.now();
    await AnalyticsCache.invalidateUserAnalytics(userId); // Force cache miss
    const analytics1 = await AnalyticsCache.getOverviewAnalytics(userId);
    const time1 = Date.now() - start1;

    // Second request (cache hit)
    const start2 = Date.now();
    const analytics2 = await AnalyticsCache.getOverviewAnalytics(userId);
    const time2 = Date.now() - start2;

    const testResults = {
      firstRequest: {
        responseTime: time1,
        cacheStatus: 'MISS',
        dataReturned: !!analytics1,
      },
      secondRequest: {
        responseTime: time2,
        cacheStatus: 'HIT',
        dataReturned: !!analytics2,
      },
      improvement: {
        speedup:
          time1 > 0
            ? `${(((time1 - time2) / time1) * 100).toFixed(1)}%`
            : 'N/A',
        absoluteImprovement: `${time1 - time2}ms`,
      },
    };

    new SuccessResponse('Cache performance test completed', testResults).send(
      res,
    );
  }),
);

/**
 * **Cache Statistics**
 *
 * GET /api/v1/cache/stats
 *
 * Get detailed statistics about what's currently cached and cache utilization.
 */
router.get(
  '/stats',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const [analyticsStats, apiStats] = await Promise.all([
      AnalyticsCache.getCacheStats(),
      ExternalAPICache.getAPICallsSaved(),
    ]);

    const stats = {
      analytics: analyticsStats,
      externalAPIs: apiStats,
      timestamp: new Date(),
      ttlInfo: {
        analytics: '5 minutes',
        realTimeMetrics: '30 seconds',
        userContent: '5 minutes',
        userSettings: '30 minutes',
        llmResponses: '1 hour',
        embeddings: '24 hours',
      },
    };

    new SuccessResponse('Cache statistics retrieved successfully', stats).send(
      res,
    );
  }),
);

/**
 * **Emergency Cache Clear**
 *
 * DELETE /api/v1/cache/emergency/clear
 *
 * Nuclear option: clear all caches. Use only in emergencies or during maintenance.
 * This will temporarily slow down the application until caches are rebuilt.
 */
router.delete(
  '/emergency/clear',
  asyncHandler(async (req: ProtectedRequest, res) => {
    const cacheManager = CacheManager.getInstance();
    await cacheManager.emergencyCacheClear();

    new SuccessResponse(
      'Emergency cache clear completed - all caches cleared',
      {},
    ).send(res);
  }),
);

export default router;
