import { Types } from 'mongoose';
import {
  SUPPORTED_CATEGORIES,
  SUPPORTED_PLATFORMS,
} from '../database/model/trend';

// Updated types for hybrid approach
export type TrendPlatform =
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'all'
  | string;

export type TrendCategory =
  | 'technology'
  | 'entertainment'
  | 'sports'
  | 'politics'
  | 'business'
  | 'health'
  | 'lifestyle'
  | 'travel'
  | 'food'
  | 'fashion'
  | 'science'
  | 'education'
  | 'finance'
  | 'gaming'
  | 'music'
  | 'general'
  | string;

export type TrendStatus = 'rising' | 'peak' | 'declining' | 'stable';

export type TrendSentiment = 'positive' | 'negative' | 'neutral';

// Flexible metrics structure
export interface TrendMetrics {
  volume: number;
  growthRate: number;
  sentiment: number; // -1 to 1
  engagement?: number;
  reach?: number;
}

export interface TrendHistoryPoint {
  date: Date;
  metrics: TrendMetrics;
}

// Main Trend interface - hybrid approach
export interface Trend {
  _id: Types.ObjectId;
  keyword: string;
  hashtags?: string[];
  platform: TrendPlatform;
  category: TrendCategory;
  status?: TrendStatus;

  // Simplified metrics for service compatibility
  volume: number;
  growth: number;
  sentiment: TrendSentiment;

  // Extended metrics for detailed analysis
  metrics?: TrendMetrics;

  // Relationships and context
  relatedTopics: string[];
  relatedTrends?: string[]; // Keep backward compatibility
  description?: string;

  // Metadata
  region?: string;
  language?: string;
  isGlobal?: boolean;

  // Timestamps
  startDate: Date;
  endDate?: Date;
  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Optional fields for backward compatibility
  history?: TrendHistoryPoint[];
}

export interface TrendFilters {
  platform?: TrendPlatform;
  category?: TrendCategory;
  status?: TrendStatus;
  isGlobal?: boolean;
  region?: string;
  language?: string;
  keyword?: string;
  minVolume?: number;
  minGrowthRate?: number;
}

export interface TrendSortOptions {
  sortBy?: 'volume' | 'growthRate' | 'engagement' | 'reach' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

// Helper function to check if platform is "all"
export const isAllPlatforms = (platform: TrendPlatform): boolean => {
  return platform === 'all';
};

export const isValidPlatform = (
  platform: string,
): platform is TrendPlatform => {
  return (
    SUPPORTED_PLATFORMS.includes(platform as TrendPlatform) ||
    typeof platform === 'string'
  );
};

export const isValidCategory = (
  category: string,
): category is TrendCategory => {
  return (
    SUPPORTED_CATEGORIES.includes(category as TrendCategory) ||
    typeof category === 'string'
  );
};
