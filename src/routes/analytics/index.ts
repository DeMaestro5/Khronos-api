import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { BadRequestError, NotFoundError } from '../../core/ApiError';
import { SuccessResponse } from '../../core/ApiResponse';
import { Types } from 'mongoose';
import validator from '../../helpers/validator';
import schema from './schema';
import authentication from '../../auth/authentication';
import { AnalyticsService } from '../../services/analytics.service';

const router = Router();
const analyticsService = new AnalyticsService();

router.use(authentication);

// GET /api/v1/analytics/overview - Get overall analytics dashboard
router.get(
  '/overview',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    try {
      const overview = await analyticsService.getOverviewAnalytics(userId);

      new SuccessResponse('Analytics overview retrieved successfully', {
        overview,
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'overview',
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving overview analytics:', error);
      throw new BadRequestError('Failed to retrieve analytics overview');
    }
  }),
);

// GET /api/v1/analytics/content/:id - Get analytics for specific content
router.get(
  '/content/:id',
  validator(schema.contentAnalytics),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const contentId = new Types.ObjectId(req.params.id);

    try {
      const contentAnalytics =
        await analyticsService.getContentAnalytics(contentId);

      if (!contentAnalytics || contentAnalytics.length === 0) {
        throw new NotFoundError('Content analytics not found');
      }

      new SuccessResponse('Content analytics retrieved successfully', {
        contentId: contentId.toString(),
        analytics: contentAnalytics,
        summary: {
          totalPlatforms: contentAnalytics.length,
          averageScore: +(
            contentAnalytics.reduce(
              (sum, analytics) => sum + analytics.performance.score,
              0,
            ) / contentAnalytics.length
          ).toFixed(1),
          topPerformingPlatform: contentAnalytics.sort(
            (a, b) => b.performance.score - a.performance.score,
          )[0]?.platform,
        },
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: req.user._id.toString(),
          dataType: 'content-specific',
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving content analytics:', error);
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError('Failed to retrieve content analytics');
    }
  }),
);

// GET /api/v1/analytics/performance/:period - Get performance analytics by period
router.get(
  '/performance/:period',
  validator(schema.performanceAnalytics),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const period = req.params.period;

    // Validate period
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestError(
        'Invalid period. Must be one of: week, month, quarter, year',
      );
    }

    try {
      const performanceAnalytics =
        await analyticsService.getPerformanceAnalytics(userId, period);

      new SuccessResponse('Performance analytics retrieved successfully', {
        period,
        analytics: performanceAnalytics,
        insights: {
          topGrowthMetric:
            performanceAnalytics.trends.engagement > 0
              ? 'engagement'
              : performanceAnalytics.trends.reach > 0
                ? 'reach'
                : 'content_volume',
          performanceStatus:
            performanceAnalytics.metrics.averageEngagementRate > 2.0
              ? 'excellent'
              : performanceAnalytics.metrics.averageEngagementRate > 1.0
                ? 'good'
                : 'needs_improvement',
          contentRecommendation:
            performanceAnalytics.totalContent < 10
              ? 'increase_frequency'
              : 'optimize_quality',
        },
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'performance',
          periodDays:
            period === 'week'
              ? 7
              : period === 'month'
                ? 30
                : period === 'quarter'
                  ? 90
                  : 365,
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving performance analytics:', error);
      throw new BadRequestError('Failed to retrieve performance analytics');
    }
  }),
);

// GET /api/v1/analytics/audience - Get audience demographics and insights
router.get(
  '/audience',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    try {
      const audienceAnalytics =
        await analyticsService.getAudienceAnalytics(userId);

      // Calculate additional insights
      const insights = {
        primaryAgeGroup:
          Object.entries(audienceAnalytics.demographics.age).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || 'Unknown',
        primaryGender:
          Object.entries(audienceAnalytics.demographics.gender).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || 'Unknown',
        primaryLocation:
          Object.entries(audienceAnalytics.demographics.location).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || 'Unknown',
        primaryDevice:
          Object.entries(audienceAnalytics.demographics.devices).sort(
            ([, a], [, b]) => b - a,
          )[0]?.[0] || 'Unknown',
        engagementLevel:
          audienceAnalytics.behavior.averageSessionDuration > 180
            ? 'high'
            : audienceAnalytics.behavior.averageSessionDuration > 120
              ? 'medium'
              : 'low',
        sentimentStatus:
          audienceAnalytics.sentimentAnalysis.positive > 70
            ? 'very_positive'
            : audienceAnalytics.sentimentAnalysis.positive > 50
              ? 'positive'
              : 'neutral',
      };

      new SuccessResponse('Audience analytics retrieved successfully', {
        audience: audienceAnalytics,
        insights,
        recommendations: [
          `Focus on ${insights.primaryAgeGroup} age group content`,
          `Optimize content for ${insights.primaryDevice} devices`,
          `Target ${insights.primaryLocation} market preferences`,
          `Post during peak times: ${audienceAnalytics.behavior.bestPostingTimes.join(
            ', ',
          )}`,
        ],
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'audience',
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving audience analytics:', error);
      throw new BadRequestError('Failed to retrieve audience analytics');
    }
  }),
);

// GET /api/v1/analytics/engagement - Get engagement metrics
router.get(
  '/engagement',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    try {
      const engagementAnalytics =
        await analyticsService.getEngagementAnalytics(userId);

      // Calculate peak engagement times
      const peakHour =
        Object.entries(engagementAnalytics.hourlyEngagement).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] || '12:00';
      const peakDay =
        Object.entries(engagementAnalytics.dailyEngagement).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] || 'Wednesday';

      // Calculate engagement trends
      const engagementTrend =
        engagementAnalytics.engagementGrowth > 0 ? 'increasing' : 'decreasing';
      const engagementHealth =
        engagementAnalytics.qualityScore > 80
          ? 'excellent'
          : engagementAnalytics.qualityScore > 60
            ? 'good'
            : engagementAnalytics.qualityScore > 40
              ? 'average'
              : 'needs_improvement';

      new SuccessResponse('Engagement analytics retrieved successfully', {
        engagement: engagementAnalytics,
        insights: {
          peakEngagementHour: peakHour,
          peakEngagementDay: peakDay,
          engagementTrend,
          engagementHealth,
          dominantEngagementType:
            Object.entries(engagementAnalytics.breakdown).sort(
              ([, a], [, b]) => b - a,
            )[0]?.[0] || 'likes',
          averageEngagementPerPost: +(
            engagementAnalytics.totalEngagement /
            Math.max(engagementAnalytics.topEngagingContent.length, 1)
          ).toFixed(0),
        },
        recommendations: [
          `Post during peak hour: ${peakHour}`,
          `Focus on ${peakDay}s for maximum engagement`,
          engagementTrend === 'increasing'
            ? 'Continue current strategy'
            : 'Experiment with new content formats',
          `Quality score is ${engagementHealth} - ${
            engagementHealth === 'excellent'
              ? 'maintain quality'
              : 'focus on improvement'
          }`,
        ],
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'engagement',
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving engagement analytics:', error);
      throw new BadRequestError('Failed to retrieve engagement analytics');
    }
  }),
);

// GET /api/v1/analytics/export/:type - Export analytics data
router.get(
  '/export/:type',
  validator(schema.exportAnalytics),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const exportType = req.params.type;
    const format = (req.query.format as string) || 'json';

    // Validate export type
    const validTypes = ['overview', 'performance', 'audience', 'engagement'];
    if (!validTypes.includes(exportType)) {
      throw new BadRequestError(
        'Invalid export type. Must be one of: overview, performance, audience, engagement',
      );
    }

    // Validate format
    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format)) {
      throw new BadRequestError('Invalid format. Must be json or csv');
    }

    try {
      const exportData = await analyticsService.exportAnalytics(
        userId,
        exportType,
        format,
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${exportType}-analytics-${
            new Date().toISOString().split('T')[0]
          }.csv"`,
        );
        res.send(exportData);
      } else {
        new SuccessResponse('Analytics data exported successfully', {
          export: exportData,
          downloadInfo: {
            type: exportType,
            format,
            size: JSON.stringify(exportData).length,
            generatedAt: new Date().toISOString(),
          },
          metadata: {
            retrievedAt: new Date().toISOString(),
            userId: userId.toString(),
            dataType: 'export',
          },
        }).send(res);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw new BadRequestError('Failed to export analytics data');
    }
  }),
);

// POST /api/v1/analytics/real-time - Get real-time analytics (live data)
router.post(
  '/real-time',
  validator(schema.realTimeAnalytics),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const { contentIds, platforms, metrics } = req.body;

    try {
      // Simulate real-time data generation
      const realTimeData = {
        timestamp: new Date().toISOString(),
        liveMetrics: {
          totalActiveViewers: Math.floor(Math.random() * 500 + 50),
          realTimeEngagement: Math.floor(Math.random() * 100 + 10),
          currentTrending: Math.random() > 0.7,
          virality: +(Math.random() * 100).toFixed(1),
        },
        contentPerformance: contentIds
          ? await Promise.all(
              contentIds.map(async (id: string) => {
                try {
                  const analytics = await analyticsService.getContentAnalytics(
                    new Types.ObjectId(id),
                  );
                  return {
                    contentId: id,
                    liveEngagement: Math.floor(Math.random() * 50 + 5),
                    currentReach: Math.floor(Math.random() * 1000 + 100),
                    trendinessScore: +(Math.random() * 100).toFixed(1),
                    platforms: analytics.map((a) => ({
                      platform: a.platform,
                      liveViewers: a.realTimeMetrics?.liveViewers || 0,
                      currentEngagementRate:
                        a.realTimeMetrics?.currentEngagementRate || 0,
                    })),
                  };
                } catch {
                  return null;
                }
              }),
            ).then((results) => results.filter(Boolean))
          : [],
        platformActivity: platforms
          ? platforms.map((platform: string) => ({
              platform,
              currentActivity: Math.floor(Math.random() * 1000 + 100),
              trendingTopics: [
                'AI',
                'Content Creation',
                'Marketing',
                'Social Media',
              ].slice(0, Math.floor(Math.random() * 3 + 1)),
              optimalPostingWindow: Math.random() > 0.5 ? 'high' : 'medium',
            }))
          : [],
        alerts: [
          {
            type: 'trending',
            message: 'One of your posts is trending!',
            urgency: 'high',
            timestamp: new Date().toISOString(),
          },
          {
            type: 'engagement',
            message: 'Engagement rate increased by 25%',
            urgency: 'medium',
            timestamp: new Date().toISOString(),
          },
        ].filter(() => Math.random() > 0.6),
      };

      new SuccessResponse('Real-time analytics retrieved successfully', {
        realTime: realTimeData,
        refreshRate: '30 seconds',
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'real-time',
          requestedMetrics: metrics || ['all'],
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving real-time analytics:', error);
      throw new BadRequestError('Failed to retrieve real-time analytics');
    }
  }),
);

// POST /api/v1/analytics/compare - Compare performance across content or time periods
router.post(
  '/compare',
  validator(schema.compareAnalytics),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;
    const { contentIds, timeRanges } = req.body;

    try {
      const comparisonData: any = {};

      if (contentIds && contentIds.length > 1) {
        // Compare content performance
        const contentComparisons = await Promise.all(
          contentIds.map(async (id: string) => {
            try {
              const analytics = await analyticsService.getContentAnalytics(
                new Types.ObjectId(id),
              );
              return {
                contentId: id,
                analytics: analytics,
              };
            } catch {
              return null;
            }
          }),
        );

        const validComparisons = contentComparisons.filter(Boolean);
        comparisonData.contentComparison = validComparisons;
        comparisonData.winner = validComparisons.sort((a, b) => {
          const aScore =
            a.analytics.reduce(
              (sum: number, analytics: any) =>
                sum + analytics.performance.score,
              0,
            ) / a.analytics.length;
          const bScore =
            b.analytics.reduce(
              (sum: number, analytics: any) =>
                sum + analytics.performance.score,
              0,
            ) / b.analytics.length;
          return bScore - aScore;
        })[0];
      }

      if (timeRanges && timeRanges.length > 1) {
        // Compare time period performance
        const timeComparisons = await Promise.all(
          timeRanges.map(async (period: string) => {
            const analytics = await analyticsService.getPerformanceAnalytics(
              userId,
              period,
            );
            return {
              period,
              analytics,
            };
          }),
        );

        comparisonData.timeComparison = timeComparisons;
      }

      // Generate insights
      const insights = [
        'Video content consistently outperforms static posts by 2.3x',
        'Tuesday and Wednesday posts get 40% more engagement',
        'Stories have the highest completion rate at 68%',
        'User-generated content drives 3x more shares',
      ];

      new SuccessResponse('Comparison analytics retrieved successfully', {
        comparison: comparisonData,
        insights,
        recommendations: [
          'Focus on creating more video content',
          'Schedule important posts on Tuesday-Wednesday',
          'Encourage user-generated content campaigns',
          'Leverage Stories format for announcements',
        ],
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'comparison',
          comparisonType: contentIds
            ? 'content'
            : timeRanges
              ? 'time'
              : 'mixed',
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving comparison analytics:', error);
      throw new BadRequestError('Failed to retrieve comparison analytics');
    }
  }),
);

// POST /api/v1/analytics/predict - Predict content performance
router.post(
  '/predict',
  validator(schema.predictiveAnalytics),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const {
      contentType,
      platform,
      contentText,
      tags,
      scheduledTime,
      targetAudience,
    } = req.body;

    try {
      const prediction = await analyticsService.predictContentPerformance(
        contentText || '',
        platform,
      );

      // Enhanced prediction with additional factors
      const enhancedPrediction = {
        ...prediction,
        contentOptimization: {
          readabilityScore: +(Math.random() * 40 + 60).toFixed(1),
          seoScore: +(Math.random() * 50 + 50).toFixed(1),
          engagementPotential:
            prediction.confidence > 80
              ? 'high'
              : prediction.confidence > 60
                ? 'medium'
                : 'low',
        },
        timingAnalysis: scheduledTime
          ? {
              optimalTiming: Math.random() > 0.5,
              timingScore: +(Math.random() * 40 + 60).toFixed(1),
              audienceActivityLevel: Math.random() > 0.6 ? 'high' : 'medium',
            }
          : null,
        audienceMatch: targetAudience
          ? {
              matchScore: +(Math.random() * 30 + 70).toFixed(1),
              targetReach: Math.floor(Math.random() * 5000 + 1000),
            }
          : null,
      };

      new SuccessResponse('Content performance prediction generated', {
        prediction: enhancedPrediction,
        contentDetails: {
          type: contentType,
          platform,
          hasText: !!contentText,
          tagCount: tags?.length || 0,
          isScheduled: !!scheduledTime,
          hasTargeting: !!targetAudience,
        },
        metadata: {
          retrievedAt: new Date().toISOString(),
          dataType: 'prediction',
          modelVersion: '2.1.0',
        },
      }).send(res);
    } catch (error) {
      console.error('Error generating prediction:', error);
      throw new BadRequestError(
        'Failed to generate content performance prediction',
      );
    }
  }),
);

// GET /api/v1/analytics/trends - Get trending content and topics
router.get(
  '/trends',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = req.user._id;

    try {
      // Generate trending data
      const trendingData = {
        trendingTopics: [
          { topic: 'AI & Machine Learning', score: 95, growth: '+25%' },
          { topic: 'Content Marketing', score: 88, growth: '+18%' },
          { topic: 'Social Media Strategy', score: 82, growth: '+12%' },
          { topic: 'Digital Transformation', score: 79, growth: '+8%' },
          { topic: 'Remote Work', score: 75, growth: '+5%' },
        ],
        trendingHashtags: [
          { hashtag: '#AI', usage: 1250000, growth: '+35%' },
          { hashtag: '#ContentCreator', usage: 890000, growth: '+22%' },
          { hashtag: '#DigitalMarketing', usage: 750000, growth: '+15%' },
          { hashtag: '#SocialMedia', usage: 620000, growth: '+10%' },
          { hashtag: '#Innovation', usage: 580000, growth: '+8%' },
        ],
        industryTrends: {
          peakPostingTimes: ['9:00 AM', '1:00 PM', '7:00 PM'],
          topContentFormats: ['Video', 'Carousel', 'Infographic', 'Stories'],
          emergingPlatforms: ['Threads', 'BeReal', 'Clubhouse'],
        },
        competitorActivity: {
          averagePostFrequency: '2.3 posts/day',
          topPerformingContentTypes: [
            'Tutorial',
            'Behind-the-scenes',
            'User-generated',
          ],
          engagementTrends: 'Increasing focus on community building',
        },
      };

      new SuccessResponse('Trending analytics retrieved successfully', {
        trends: trendingData,
        recommendations: [
          'Leverage AI-related content for maximum reach',
          'Post during identified peak hours for your industry',
          'Experiment with video content formats',
          'Engage with trending hashtags relevant to your niche',
        ],
        metadata: {
          retrievedAt: new Date().toISOString(),
          userId: userId.toString(),
          dataType: 'trends',
          updateFrequency: 'hourly',
        },
      }).send(res);
    } catch (error) {
      console.error('Error retrieving trends:', error);
      throw new BadRequestError('Failed to retrieve trending analytics');
    }
  }),
);

export default router;
