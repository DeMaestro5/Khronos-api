import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { SuccessResponse, BadRequestResponse } from '../../core/ApiResponse';
import { TrendService, Trend } from '../../services/trend.service';
import authentication from '../../auth/authentication';
import { Types } from 'mongoose';

const router = Router();
const trendService = new TrendService();

router.use(authentication);

// GET /api/trends - Get current trending topics
router.get(
  '/',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const platform = (req.query.platform as string) || 'all';
    const category = req.query.category as string;

    const analysis = await trendService.analyzeTrends(platform, category);

    new SuccessResponse('Current trends retrieved successfully', {
      platform,
      category: category || 'all',
      analysis,
    }).send(res);
  }),
);

// GET /api/trends/:platform - Get trending topics by platform
router.get(
  '/:platform',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const platform = req.params.platform;
    const category = req.query.category as string;

    if (!platform || platform.trim().length === 0) {
      throw new BadRequestResponse('Platform parameter is required');
    }

    const analysis = await trendService.analyzeTrends(platform, category);

    new SuccessResponse(
      `Trending topics for ${platform} retrieved successfully`,
      {
        platform,
        category: category || 'all',
        analysis,
      },
    ).send(res);
  }),
);

// GET /api/trends/category/:category - Get trending topics by category
router.get(
  '/category/:category',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const category = req.params.category;
    const platform = (req.query.platform as string) || 'all';

    if (!category || category.trim().length === 0) {
      throw new BadRequestResponse('Category parameter is required');
    }

    const analysis = await trendService.analyzeTrends(platform, category);

    new SuccessResponse(
      `Trending topics for ${category} category retrieved successfully`,
      {
        platform,
        category,
        analysis,
      },
    ).send(res);
  }),
);

// GET /api/trends/historical/:days - Get historical trend data
router.get(
  '/historical/:days',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const days = parseInt(req.params.days);
    const platform = (req.query.platform as string) || 'all';

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      throw new BadRequestResponse('Days must be a number between 1 and 365');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await trendService.generateTrendReport(platform, {
      start: startDate,
      end: endDate,
    });

    new SuccessResponse(
      `Historical trends for ${days} days retrieved successfully`,
      {
        period: {
          days,
          startDate,
          endDate,
        },
        platform,
        report,
      },
    ).send(res);
  }),
);

// POST /api/trends/custom - Get custom trend analysis based on parameters
router.post(
  '/custom',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { platform = 'all', category, keywords, timeRange } = req.body;

    // Validate timeRange if provided
    if (timeRange && (timeRange.start || timeRange.end)) {
      const startDate = timeRange.start ? new Date(timeRange.start) : null;
      const endDate = timeRange.end ? new Date(timeRange.end) : null;

      if (startDate && isNaN(startDate.getTime())) {
        throw new BadRequestResponse('Invalid start date format');
      }
      if (endDate && isNaN(endDate.getTime())) {
        throw new BadRequestResponse('Invalid end date format');
      }
      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestResponse('Start date cannot be after end date');
      }
    }

    // For custom analysis, we'll use the analyzeTrends method with enhanced parameters
    // If keywords are provided, we can append them to the category for better analysis
    let analysisCategory = category;
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      analysisCategory = `${category || 'general'} focusing on: ${keywords.join(
        ', ',
      )}`;
    }

    const analysis = await trendService.analyzeTrends(
      platform,
      analysisCategory,
    );

    // If timeRange is provided, also generate a historical report
    let historicalReport = null;
    if (timeRange && timeRange.start && timeRange.end) {
      try {
        historicalReport = await trendService.generateTrendReport(platform, {
          start: new Date(timeRange.start),
          end: new Date(timeRange.end),
        });
      } catch (error) {
        console.warn('Failed to generate historical report:', error);
      }
    }

    new SuccessResponse('Custom trend analysis completed successfully', {
      parameters: {
        platform,
        category,
        keywords,
        timeRange,
      },
      analysis,
      historicalReport,
    }).send(res);
  }),
);

// GET /api/trends/predict/:keyword - Get trend prediction for a specific keyword
router.get(
  '/predict/:keyword',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const keyword = req.params.keyword;
    const platform = (req.query.platform as string) || 'all';

    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestResponse('Keyword is required');
    }

    if (keyword.length > 100) {
      throw new BadRequestResponse('Keyword is too long (max 100 characters)');
    }

    // Create a mock trend object for prediction
    // In a real implementation, you might fetch this from your database
    const mockTrend: Trend = {
      _id: new Types.ObjectId(),
      keyword: keyword.trim(),
      platform,
      category: 'general',
      volume: 0,
      growth: 0,
      sentiment: 'neutral',
      relatedTopics: [],
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prediction = await trendService.predictTrendGrowth(mockTrend);
    const relatedTrends = await trendService.getRelatedTrends(mockTrend);

    new SuccessResponse(
      `Trend prediction for "${keyword}" completed successfully`,
      {
        keyword,
        platform,
        prediction,
        relatedTrends,
      },
    ).send(res);
  }),
);

// GET /api/trends/related/:keyword - Get related trends for a keyword
router.get(
  '/related/:keyword',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const keyword = req.params.keyword;
    const platform = (req.query.platform as string) || 'all';

    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestResponse('Keyword is required');
    }

    // Create a mock trend object for related trends search
    const mockTrend: Trend = {
      _id: new Types.ObjectId(),
      keyword: keyword.trim(),
      platform,
      category: 'general',
      volume: 0,
      growth: 0,
      sentiment: 'neutral',
      relatedTopics: [],
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const relatedTrends = await trendService.getRelatedTrends(mockTrend);

    new SuccessResponse(
      `Related trends for "${keyword}" retrieved successfully`,
      {
        keyword,
        platform,
        relatedTrends,
      },
    ).send(res);
  }),
);

// GET /api/trends/report/:platform - Generate comprehensive trend report
router.get(
  '/report/:platform',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const platform = req.params.platform;
    const days = parseInt(req.query.days as string) || 7;

    if (!platform || platform.trim().length === 0) {
      throw new BadRequestResponse('Platform parameter is required');
    }

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      throw new BadRequestResponse('Days must be a number between 1 and 365');
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await trendService.generateTrendReport(platform, {
      start: startDate,
      end: endDate,
    });

    new SuccessResponse(`Trend report for ${platform} generated successfully`, {
      platform,
      period: {
        days,
        startDate,
        endDate,
      },
      report,
    }).send(res);
  }),
);

// GET /api/trends/platforms - Get available platforms (static data)
router.get(
  '/platforms',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const platforms = [
      { value: 'twitter', label: 'Twitter' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'reddit', label: 'Reddit' },
      { value: 'all', label: 'All Platforms' },
    ];

    new SuccessResponse('Available platforms retrieved successfully', {
      platforms,
    }).send(res);
  }),
);

// GET /api/trends/categories - Get available categories (static data)
router.get(
  '/categories',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const categories = [
      { value: 'technology', label: 'Technology' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'sports', label: 'Sports' },
      { value: 'politics', label: 'Politics' },
      { value: 'business', label: 'Business' },
      { value: 'health', label: 'Health' },
      { value: 'lifestyle', label: 'Lifestyle' },
      { value: 'travel', label: 'Travel' },
      { value: 'food', label: 'Food' },
      { value: 'fashion', label: 'Fashion' },
      { value: 'science', label: 'Science' },
      { value: 'education', label: 'Education' },
      { value: 'finance', label: 'Finance' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'music', label: 'Music' },
      { value: 'general', label: 'General' },
    ];

    new SuccessResponse('Available categories retrieved successfully', {
      categories,
    }).send(res);
  }),
);

export default router;
