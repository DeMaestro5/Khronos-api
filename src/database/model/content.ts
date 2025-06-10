import { model, Schema, Types } from 'mongoose';

export const DOCUMENT_NAME = 'Content';
export const COLLECTION_NAME = 'contents';

export interface ContentAuthor {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface ContentPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ContentAttachment {
  name: string;
  type: 'image' | 'document' | 'video' | 'audio';
  size: string;
  url?: string;
}

export interface ContentStats {
  views: number;
  engagement: number;
  shares: number;
  saves?: number;
  clicks?: number;
}

export interface AIContentSuggestions {
  title: string;
  description: string;
  keywords: string[];
  improvements: string[];
  hashtags?: string[];
  optimalPostingTimes?: Date[];
  estimatedReach?: number;
  competitorAnalysis?: string[];
}

export interface ContentIdea {
  title: string;
  description: string;
  body?: string;
  excerpt?: string;
  targetAudience: string;
  keyPoints: string[];
  callToAction: string;
  estimatedEngagement: number;
  difficulty: 'easy' | 'moderate' | 'advanced';
  timeToCreate: string;
  trendingScore: number;
}

export default interface Content {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  metadata: {
    title: string;
    description: string;
    type:
      | 'article'
      | 'video'
      | 'social'
      | 'podcast'
      | 'blog_post'
      | 'newsletter';
    status: 'draft' | 'scheduled' | 'published' | 'archived';
    scheduledDate?: Date;
    publishedDate?: Date;
    platform: string[];
    tags: string[];
    category?: string;
    language?: string;
    targetAudience?: string[];
    contentPillars?: string[];
  };
  title: string;
  description: string;
  excerpt?: string;
  body?: any; // Structured JSON content instead of HTML string
  type: 'article' | 'video' | 'social' | 'podcast' | 'blog_post' | 'newsletter';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  platform: string[];
  tags: string[];
  platforms?: ContentPlatform[];
  author?: ContentAuthor;
  attachments?: ContentAttachment[];
  stats?: ContentStats;
  aiSuggestions?: AIContentSuggestions;
  aiGenerated?: boolean;
  contentIdeas?: ContentIdea[];
  optimizedContent?: Record<string, string>; // platform -> optimized content

  // Store actual platform-specific post/video IDs for analytics
  platformPostIds?: Record<string, string>; // platform -> actual post ID (e.g., YouTube video ID)

  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
    saves?: number;
    clicks?: number;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  scheduling?: {
    timezone?: string;
    optimalTimes?: Date[];
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  analytics?: {
    impressions?: number;
    reach?: number;
    clickThroughRate?: number;
    conversionRate?: number;
    engagementRate?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<Content>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      title: {
        type: Schema.Types.String,
        required: true,
        trim: true,
        maxlength: 500,
      },
      description: {
        type: Schema.Types.String,
        required: true,
        trim: true,
        maxlength: 2000,
      },
      type: {
        type: Schema.Types.String,
        required: true,
        enum: [
          'article',
          'video',
          'social',
          'podcast',
          'blog_post',
          'newsletter',
        ],
      },
      status: {
        type: Schema.Types.String,
        required: true,
        enum: ['draft', 'scheduled', 'published', 'archived'],
        default: 'draft',
      },
      scheduledDate: {
        type: Schema.Types.Date,
      },
      publishedDate: {
        type: Schema.Types.Date,
      },
      platform: [
        {
          type: Schema.Types.String,
        },
      ],
      tags: [
        {
          type: Schema.Types.String,
        },
      ],
      category: {
        type: Schema.Types.String,
        trim: true,
      },
      language: {
        type: Schema.Types.String,
        default: 'en',
      },
      targetAudience: [
        {
          type: Schema.Types.String,
        },
      ],
      contentPillars: [
        {
          type: Schema.Types.String,
        },
      ],
    },
    title: {
      type: Schema.Types.String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: Schema.Types.String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    excerpt: {
      type: Schema.Types.String,
      trim: true,
      maxlength: 500,
    },
    body: {
      type: Schema.Types.Mixed,
    },
    type: {
      type: Schema.Types.String,
      required: true,
      enum: [
        'article',
        'video',
        'social',
        'podcast',
        'blog_post',
        'newsletter',
      ],
    },
    status: {
      type: Schema.Types.String,
      required: true,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
    },
    platform: [
      {
        type: Schema.Types.String,
      },
    ],
    tags: [
      {
        type: Schema.Types.String,
      },
    ],
    platforms: [
      {
        id: String,
        name: String,
        icon: String,
        color: String,
      },
    ],
    author: {
      id: String,
      name: String,
      avatar: String,
      role: String,
    },
    attachments: [
      {
        name: String,
        type: {
          type: String,
          enum: ['image', 'document', 'video', 'audio'],
        },
        size: String,
        url: String,
      },
    ],
    stats: {
      views: {
        type: Schema.Types.Number,
        default: 0,
      },
      engagement: {
        type: Schema.Types.Number,
        default: 0,
      },
      shares: {
        type: Schema.Types.Number,
        default: 0,
      },
      saves: {
        type: Schema.Types.Number,
        default: 0,
      },
      clicks: {
        type: Schema.Types.Number,
        default: 0,
      },
    },
    aiSuggestions: {
      title: String,
      description: String,
      keywords: [String],
      improvements: [String],
      hashtags: [String],
      optimalPostingTimes: [Date],
      estimatedReach: Number,
      competitorAnalysis: [String],
    },
    aiGenerated: {
      type: Schema.Types.Boolean,
      default: false,
    },
    contentIdeas: [
      {
        title: String,
        description: String,
        body: {
          type: Schema.Types.Mixed,
        },
        excerpt: String,
        targetAudience: String,
        keyPoints: [String],
        callToAction: String,
        estimatedEngagement: {
          type: Number,
          default: 0,
        },
        difficulty: {
          type: String,
          enum: ['easy', 'moderate', 'advanced'],
          default: 'moderate',
        },
        timeToCreate: String,
        trendingScore: {
          type: Number,
          default: 0,
        },
      },
    ],
    optimizedContent: {
      type: Schema.Types.Mixed,
      default: {},
    },
    engagement: {
      likes: {
        type: Schema.Types.Number,
        default: 0,
      },
      shares: {
        type: Schema.Types.Number,
        default: 0,
      },
      comments: {
        type: Schema.Types.Number,
        default: 0,
      },
      views: {
        type: Schema.Types.Number,
        default: 0,
      },
      saves: {
        type: Schema.Types.Number,
        default: 0,
      },
      clicks: {
        type: Schema.Types.Number,
        default: 0,
      },
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      canonicalUrl: String,
    },
    scheduling: {
      timezone: String,
      optimalTimes: [Date],
      frequency: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly'],
        default: 'once',
      },
    },
    analytics: {
      impressions: {
        type: Schema.Types.Number,
        default: 0,
      },
      reach: {
        type: Schema.Types.Number,
        default: 0,
      },
      clickThroughRate: {
        type: Schema.Types.Number,
        default: 0,
      },
      conversionRate: {
        type: Schema.Types.Number,
        default: 0,
      },
      engagementRate: {
        type: Schema.Types.Number,
        default: 0,
      },
    },

    // Store actual platform-specific post/video IDs for real analytics
    platformPostIds: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Schema.Types.Date,
      required: true,
    },
    updatedAt: {
      type: Schema.Types.Date,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

schema.index({ _id: 1, status: 1 });
schema.index({ userId: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ 'metadata.tags': 1 });
schema.index({ 'metadata.platform': 1 });

export const ContentModel = model<Content>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);
