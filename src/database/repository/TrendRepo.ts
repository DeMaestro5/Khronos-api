import { Types } from 'mongoose';
import { TrendModel } from '../model/trend';
import {
  Trend,
  TrendFilters,
  TrendSortOptions,
  TrendCategory,
  TrendPlatform,
  TrendMetrics,
  TrendHistoryPoint,
  isAllPlatforms,
} from '../../types/trend.types';

async function create(trend: Trend): Promise<Trend> {
  const now = new Date();

  // Ensure required fields are set
  const trendData = {
    ...trend,
    createdAt: trend.createdAt || now,
    updatedAt: now,
    lastUpdated: now,
    // Map simplified fields to metrics if metrics not provided
    metrics: trend.metrics || {
      volume: trend.volume || 0,
      growthRate: trend.growth || 0,
      sentiment:
        trend.sentiment === 'positive'
          ? 0.5
          : trend.sentiment === 'negative'
            ? -0.5
            : 0,
      engagement: 0,
      reach: 0,
    },
    // Ensure backward compatibility
    relatedTrends: trend.relatedTrends || trend.relatedTopics || [],
  };

  const createdTrend = await TrendModel.create(trendData);
  return createdTrend.toObject();
}

async function findById(id: Types.ObjectId): Promise<Trend | null> {
  const trend = await TrendModel.findOne({ _id: id }).lean().exec();
  return trend ? mapDatabaseTrendToServiceTrend(trend) : null;
}

async function findByKeywordAndPlatform(
  keyword: string,
  platform: TrendPlatform,
): Promise<Trend | null> {
  const trend = await TrendModel.findOne({ keyword, platform }).lean().exec();
  return trend ? mapDatabaseTrendToServiceTrend(trend) : null;
}

async function findTrends(
  filters: TrendFilters = {},
  sortOptions: TrendSortOptions = {},
  page: number = 1,
  limit: number = 20,
): Promise<Trend[]> {
  const query: any = {};

  // Build query filters
  if (filters.platform && !isAllPlatforms(filters.platform)) {
    query.platform = filters.platform;
  }
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.isGlobal !== undefined) query.isGlobal = filters.isGlobal;
  if (filters.region) query.region = filters.region;
  if (filters.language) query.language = filters.language;
  if (filters.keyword) {
    query.$text = { $search: filters.keyword };
  }
  if (filters.minVolume) {
    query.$or = [
      { 'metrics.volume': { $gte: filters.minVolume } },
      { volume: { $gte: filters.minVolume } }, // Fallback to simple field
    ];
  }
  if (filters.minGrowthRate) {
    query.$or = [
      { 'metrics.growthRate': { $gte: filters.minGrowthRate } },
      { growth: { $gte: filters.minGrowthRate } }, // Fallback to simple field
    ];
  }

  // Build sort options
  const sortBy = sortOptions.sortBy || 'volume';
  const sortOrder = sortOptions.sortOrder === 'asc' ? 1 : -1;

  let sortField: string;
  switch (sortBy) {
    case 'volume':
      sortField = 'metrics.volume';
      break;
    case 'growthRate':
      sortField = 'metrics.growthRate';
      break;
    case 'engagement':
      sortField = 'metrics.engagement';
      break;
    case 'reach':
      sortField = 'metrics.reach';
      break;
    case 'lastUpdated':
      sortField = 'lastUpdated';
      break;
    default:
      sortField = 'metrics.volume';
  }

  const sortObj: any = {};
  sortObj[sortField] = sortOrder;
  // Add fallback sort for simple fields
  if (sortBy === 'volume') {
    sortObj['volume'] = sortOrder;
  } else if (sortBy === 'growthRate') {
    sortObj['growth'] = sortOrder;
  }

  const trends = await TrendModel.find(query)
    .sort(sortObj)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

async function findTrendingByPlatform(
  platform: TrendPlatform,
  limit: number = 20,
): Promise<Trend[]> {
  const query: any = {};
  if (!isAllPlatforms(platform)) {
    query.platform = platform;
  }

  const trends = await TrendModel.find(query)
    .sort({
      'metrics.volume': -1,
      'metrics.growthRate': -1,
      volume: -1, // Fallback sort
      growth: -1, // Fallback sort
    })
    .limit(limit)
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

async function findTrendingByCategory(
  category: TrendCategory,
  limit: number = 20,
): Promise<Trend[]> {
  const trends = await TrendModel.find({ category })
    .sort({
      'metrics.volume': -1,
      'metrics.growthRate': -1,
      volume: -1,
      growth: -1,
    })
    .limit(limit)
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

async function findHistoricalTrends(
  days: number,
  filters: TrendFilters = {},
): Promise<Trend[]> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const query: any = {
    $or: [
      { lastUpdated: { $gte: dateThreshold } },
      { updatedAt: { $gte: dateThreshold } }, // Fallback
    ],
  };

  if (filters.platform && !isAllPlatforms(filters.platform)) {
    query.platform = filters.platform;
  }
  if (filters.category) query.category = filters.category;

  const trends = await TrendModel.find(query)
    .sort({ lastUpdated: -1, updatedAt: -1 })
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

async function findRelatedTrends(
  keyword: string,
  platform?: TrendPlatform,
  limit: number = 10,
): Promise<Trend[]> {
  const query: any = {
    $or: [
      { relatedTrends: { $in: [keyword] } },
      { relatedTopics: { $in: [keyword] } }, // Check both fields
      { $text: { $search: keyword } },
    ],
    keyword: { $ne: keyword }, // Exclude the original trend
  };

  if (platform && !isAllPlatforms(platform)) {
    query.platform = platform;
  }

  const trends = await TrendModel.find(query)
    .sort({ 'metrics.volume': -1, volume: -1 })
    .limit(limit)
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

async function updateTrend(
  id: Types.ObjectId,
  updates: Partial<Trend>,
): Promise<Trend | null> {
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    lastUpdated: new Date(),
  };

  // Update metrics if simple fields are provided
  if (
    updates.volume !== undefined ||
    updates.growth !== undefined ||
    updates.sentiment !== undefined
  ) {
    updateData.metrics = {
      volume: updates.volume || 0,
      growthRate: updates.growth || 0,
      sentiment:
        updates.sentiment === 'positive'
          ? 0.5
          : updates.sentiment === 'negative'
            ? -0.5
            : 0,
      engagement: 0,
      reach: 0,
      ...updates.metrics,
    };
  }

  const updatedTrend = await TrendModel.findByIdAndUpdate(id, updateData, {
    new: true,
  })
    .lean()
    .exec();

  return updatedTrend ? mapDatabaseTrendToServiceTrend(updatedTrend) : null;
}

async function updateTrendMetrics(
  id: Types.ObjectId,
  metrics: TrendMetrics,
): Promise<Trend | null> {
  const historyPoint: TrendHistoryPoint = {
    date: new Date(),
    metrics,
  };

  const updateData = {
    metrics,
    // Also update simple fields for compatibility
    volume: metrics.volume,
    growth: metrics.growthRate,
    sentiment:
      metrics.sentiment > 0.2
        ? 'positive'
        : metrics.sentiment < -0.2
          ? 'negative'
          : 'neutral',
    $push: { history: historyPoint },
    updatedAt: new Date(),
    lastUpdated: new Date(),
  };

  const updatedTrend = await TrendModel.findByIdAndUpdate(id, updateData, {
    new: true,
  })
    .lean()
    .exec();

  return updatedTrend ? mapDatabaseTrendToServiceTrend(updatedTrend) : null;
}

async function upsertTrend(
  keyword: string,
  platform: TrendPlatform,
  trendData: Partial<Trend>,
): Promise<Trend> {
  const now = new Date();

  const updateData = {
    ...trendData,
    updatedAt: now,
    lastUpdated: now,
  };

  // Ensure metrics are set
  if (trendData.volume !== undefined || trendData.growth !== undefined) {
    updateData.metrics = {
      volume: trendData.volume || 0,
      growthRate: trendData.growth || 0,
      sentiment:
        trendData.sentiment === 'positive'
          ? 0.5
          : trendData.sentiment === 'negative'
            ? -0.5
            : 0,
      engagement: 0,
      reach: 0,
      ...trendData.metrics,
    };
  }

  const updatedTrend = await TrendModel.findOneAndUpdate(
    { keyword, platform },
    updateData,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .exec();

  return mapDatabaseTrendToServiceTrend(updatedTrend!);
}

async function deleteTrend(id: Types.ObjectId): Promise<boolean> {
  const result = await TrendModel.deleteOne({ _id: id }).exec();
  return result.deletedCount > 0;
}

async function getTrendCount(filters: TrendFilters = {}): Promise<number> {
  const query: any = {};

  if (filters.platform && !isAllPlatforms(filters.platform)) {
    query.platform = filters.platform;
  }
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.isGlobal !== undefined) query.isGlobal = filters.isGlobal;
  if (filters.region) query.region = filters.region;
  if (filters.language) query.language = filters.language;

  return TrendModel.countDocuments(query).exec();
}

async function getTopTrendsByTimeRange(
  startDate: Date,
  endDate: Date,
  platform?: TrendPlatform,
  limit: number = 10,
): Promise<Trend[]> {
  const query: any = {
    $or: [
      { lastUpdated: { $gte: startDate, $lte: endDate } },
      { updatedAt: { $gte: startDate, $lte: endDate } },
    ],
  };

  if (platform && !isAllPlatforms(platform)) {
    query.platform = platform;
  }

  const trends = await TrendModel.find(query)
    .sort({
      'metrics.volume': -1,
      'metrics.growthRate': -1,
      volume: -1,
      growth: -1,
    })
    .limit(limit)
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

async function searchTrends(
  searchTerm: string,
  platform?: TrendPlatform,
  limit: number = 20,
): Promise<Trend[]> {
  const query: any = {
    $text: { $search: searchTerm },
  };

  if (platform && !isAllPlatforms(platform)) {
    query.platform = platform;
  }

  const trends = await TrendModel.find(query)
    .sort({
      score: { $meta: 'textScore' },
      'metrics.volume': -1,
      volume: -1,
    })
    .limit(limit)
    .lean()
    .exec();

  return trends.map(mapDatabaseTrendToServiceTrend);
}

// Helper function to map database trend to service trend format
function mapDatabaseTrendToServiceTrend(dbTrend: any): Trend {
  return {
    _id: dbTrend._id,
    keyword: dbTrend.keyword,
    hashtags: dbTrend.hashtags || [],
    platform: dbTrend.platform,
    category: dbTrend.category,
    status: dbTrend.status,

    // Map to simple fields for service compatibility
    volume: dbTrend.volume || dbTrend.metrics?.volume || 0,
    growth: dbTrend.growth || dbTrend.metrics?.growthRate || 0,
    sentiment:
      dbTrend.sentiment ||
      (dbTrend.metrics?.sentiment > 0.2
        ? 'positive'
        : dbTrend.metrics?.sentiment < -0.2
          ? 'negative'
          : 'neutral'),

    // Keep extended metrics
    metrics: dbTrend.metrics,

    // Relationships - handle both field names
    relatedTopics: dbTrend.relatedTopics || dbTrend.relatedTrends || [],
    relatedTrends: dbTrend.relatedTrends || dbTrend.relatedTopics || [],
    description: dbTrend.description,

    // Metadata
    region: dbTrend.region,
    language: dbTrend.language || 'en',
    isGlobal: dbTrend.isGlobal !== undefined ? dbTrend.isGlobal : true,

    // Timestamps
    startDate: dbTrend.startDate || dbTrend.createdAt,
    endDate: dbTrend.endDate,
    lastUpdated: dbTrend.lastUpdated || dbTrend.updatedAt,
    createdAt: dbTrend.createdAt,
    updatedAt: dbTrend.updatedAt,

    // Optional
    history: dbTrend.history || [],
  };
}

// Export helper constants for validation
export const SUPPORTED_PLATFORMS: TrendPlatform[] = [
  'twitter',
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'reddit',
  'all',
];

export const SUPPORTED_CATEGORIES: TrendCategory[] = [
  'technology',
  'entertainment',
  'sports',
  'politics',
  'business',
  'health',
  'lifestyle',
  'travel',
  'food',
  'fashion',
  'science',
  'education',
  'finance',
  'gaming',
  'music',
  'general',
];

export default {
  create,
  findById,
  findByKeywordAndPlatform,
  findTrends,
  findTrendingByPlatform,
  findTrendingByCategory,
  findHistoricalTrends,
  findRelatedTrends,
  updateTrend,
  updateTrendMetrics,
  upsertTrend,
  deleteTrend,
  getTrendCount,
  getTopTrendsByTimeRange,
  searchTrends,
};
