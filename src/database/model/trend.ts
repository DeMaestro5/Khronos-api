import { TrendPlatform, TrendCategory, Trend } from '../../types/trend.types';

export interface TrendAnalysis {
  trendingTopics: Trend[];
  emergingTopics: Trend[];
  decliningTopics: Trend[];
  recommendations: string[];
}

// Helper constants for validation and UI
export const SUPPORTED_PLATFORMS: TrendPlatform[] = [
  'twitter',
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
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

// Validation helpers

// Database schema (keep simple for MongoDB)
import { Schema, model } from 'mongoose';

const trendSchema = new Schema<Trend>(
  {
    keyword: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    hashtags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    platform: {
      type: String, // Use string in DB for flexibility
      required: true,
      index: true,
    },
    category: {
      type: String, // Use string in DB for flexibility
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['rising', 'peak', 'declining', 'stable'],
      default: 'rising',
    },

    // Simplified metrics as direct fields
    volume: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    growth: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral',
    },

    // Extended metrics as optional nested object
    metrics: {
      volume: { type: Number },
      growthRate: { type: Number },
      sentiment: { type: Number, min: -1, max: 1 },
      engagement: { type: Number },
      reach: { type: Number },
    },

    relatedTopics: [
      {
        type: String,
        trim: true,
        maxlength: 100,
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    region: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    language: {
      type: String,
      default: 'en',
      maxlength: 10,
    },
    isGlobal: {
      type: Boolean,
      default: true,
    },

    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: true, // Auto-manage createdAt/updatedAt
  },
);

// Indexes for performance
trendSchema.index({ platform: 1, category: 1 });
trendSchema.index({ platform: 1, volume: -1 });
trendSchema.index({ category: 1, growth: -1 });
trendSchema.index({ keyword: 1, platform: 1 }, { unique: true });
trendSchema.index({ lastUpdated: -1 });
trendSchema.index({ volume: -1, status: 1 });

// Text search
trendSchema.index({
  keyword: 'text',
  description: 'text',
  hashtags: 'text',
});

export const TrendModel = model<Trend>('Trend', trendSchema, 'trends');
