import Joi from 'joi';

// Base schema for common fields
const baseConnectionSchema = Joi.object({
  accountName: Joi.string()
    .optional()
    .max(100)
    .description('Display name for the account'),
});

// Instagram Business Account Schema
const instagramConnectSchema = baseConnectionSchema.keys({
  igBusinessAccountId: Joi.string()
    .required()
    .pattern(/^\d{15,20}$/)
    .description('Instagram Business Account ID (15-20 digits)'),
  igUserAccessToken: Joi.string()
    .required()
    .min(50)
    .max(500)
    .pattern(/^EAAG/)
    .description('Instagram User Access Token (starts with EAAG)'),
});

// Facebook Page Schema
const facebookConnectSchema = baseConnectionSchema.keys({
  pageId: Joi.string()
    .required()
    .pattern(/^\d{10,20}$/)
    .description('Facebook Page ID (10-20 digits)'),
  pageAccessToken: Joi.string()
    .required()
    .min(50)
    .max(500)
    .pattern(/^EAAG/)
    .description('Facebook Page Access Token (starts with EAAG)'),
});

// TikTok Account Schema
const tiktokConnectSchema = baseConnectionSchema.keys({
  openId: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9]{16,32}$/)
    .description('TikTok Open ID (16-32 alphanumeric characters)'),
  accessToken: Joi.string()
    .required()
    .min(20)
    .max(200)
    .description('TikTok Access Token'),
});

// LinkedIn Account Schema
const linkedinConnectSchema = baseConnectionSchema.keys({
  memberUrn: Joi.string()
    .required()
    .pattern(/^urn:li:person:[a-zA-Z0-9]+$/)
    .description('LinkedIn Member URN (format: urn:li:person:XXXXX)'),
  accessToken: Joi.string()
    .required()
    .min(20)
    .max(200)
    .description('LinkedIn Access Token'),
});

// LinkedIn Organization Schema (for company pages)
const linkedinOrgConnectSchema = baseConnectionSchema.keys({
  organizationUrn: Joi.string()
    .required()
    .pattern(/^urn:li:organization:\d+$/)
    .description(
      'LinkedIn Organization URN (format: urn:li:organization:XXXXX)',
    ),
  accessToken: Joi.string()
    .required()
    .min(20)
    .max(200)
    .description('LinkedIn Access Token'),
});

// YouTube Channel Schema
const youtubeConnectSchema = baseConnectionSchema.keys({
  channelId: Joi.string()
    .required()
    .pattern(/^UC[a-zA-Z0-9_-]{22}$/)
    .description('YouTube Channel ID (starts with UC, 24 characters)'),
  accessToken: Joi.string()
    .required()
    .min(20)
    .max(200)
    .description('YouTube Access Token'),
  refreshToken: Joi.string()
    .optional()
    .min(20)
    .max(200)
    .description('YouTube Refresh Token (optional)'),
});

// Twitter/X Account Schema
const twitterConnectSchema = baseConnectionSchema.keys({
  userId: Joi.string()
    .required()
    .pattern(/^\d{15,20}$/)
    .description('Twitter User ID (15-20 digits)'),
  accessToken: Joi.string()
    .required()
    .min(20)
    .max(200)
    .description('Twitter Access Token'),
  accessTokenSecret: Joi.string()
    .required()
    .min(20)
    .max(200)
    .description('Twitter Access Token Secret'),
});

// Analytics Sync Schema
const analyticsSyncSchema = Joi.object({
  includePlatforms: Joi.array()
    .items(
      Joi.string().valid(
        'youtube',
        'instagram',
        'facebook',
        'tiktok',
        'linkedin',
        'twitter',
      ),
    )
    .min(1)
    .max(6)
    .optional()
    .default(['youtube', 'instagram', 'facebook', 'tiktok', 'linkedin'])
    .description('Platforms to include in sync'),

  concurrency: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .description('Number of concurrent requests per platform'),

  maxRetries: Joi.number()
    .integer()
    .min(0)
    .max(5)
    .optional()
    .default(2)
    .description('Maximum number of retry attempts'),

  retryDelayBaseMs: Joi.number()
    .integer()
    .min(100)
    .max(5000)
    .optional()
    .default(300)
    .description('Base delay for retry backoff (milliseconds)'),

  bulkWriteChunkSize: Joi.number()
    .integer()
    .min(10)
    .max(500)
    .optional()
    .default(100)
    .description('Number of database operations per batch'),
});

// Platform Post IDs Update Schema
const platformPostIdsSchema = Joi.object({
  contentId: Joi.string()
    .required()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .description('Content ID (MongoDB ObjectId)'),

  platformPostIds: Joi.object({
    youtube: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]{11}$/)
      .optional()
      .description('YouTube Video ID (11 characters)'),

    instagram: Joi.string()
      .pattern(/^\d{15,20}$/)
      .optional()
      .description('Instagram Media ID (15-20 digits)'),

    facebook: Joi.string()
      .pattern(/^\d+_\d+$/)
      .optional()
      .description('Facebook Post ID (format: pageId_postId)'),

    tiktok: Joi.string()
      .pattern(/^\d{15,20}$/)
      .optional()
      .description('TikTok Video ID (15-20 digits)'),

    linkedin: Joi.string()
      .pattern(/^urn:li:(activity|share|ugcPost):\d+$/)
      .optional()
      .description('LinkedIn Post URN'),

    twitter: Joi.string()
      .pattern(/^\d{15,20}$/)
      .optional()
      .description('Twitter Tweet ID (15-20 digits)'),
  })
    .min(1)
    .required()
    .description('Platform-specific post IDs'),
});

// Platform Status Response Schema
const platformStatusSchema = Joi.object({
  platform: Joi.string()
    .valid('youtube', 'instagram', 'facebook', 'tiktok', 'linkedin', 'twitter')
    .required(),

  isConnected: Joi.boolean().required(),
  accountId: Joi.string().optional(),
  accountName: Joi.string().optional(),
  connectAt: Joi.date().optional(),
  lastSyncAt: Joi.date().optional(),
  permissions: Joi.array().items(Joi.string()).optional(),
});

// All Platforms Status Schema
const allPlatformsStatusSchema = Joi.object({
  platforms: Joi.array().items(platformStatusSchema).required(),
  summary: Joi.object({
    totalConnected: Joi.number().integer().min(0).max(6).required(),
    totalPlatforms: Joi.number().integer().min(0).max(6).required(),
    lastSyncAt: Joi.date().optional(),
  }).required(),
});

// Error Response Schema
const errorResponseSchema = Joi.object({
  success: Joi.boolean().valid(false).required(),
  message: Joi.string().required(),
  errors: Joi.array()
    .items(
      Joi.object({
        field: Joi.string().required(),
        message: Joi.string().required(),
        code: Joi.string().optional(),
      }),
    )
    .optional(),
});

// Success Response Schema
const successResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  message: Joi.string().required(),
  data: Joi.object().required(),
});

// Helper function to get schema by platform
const getPlatformSchema = (platform: string) => {
  const schemas: Record<string, Joi.ObjectSchema> = {
    instagram: instagramConnectSchema,
    facebook: facebookConnectSchema,
    tiktok: tiktokConnectSchema,
    linkedin: linkedinConnectSchema,
    youtube: youtubeConnectSchema,
    twitter: twitterConnectSchema,
  };

  return schemas[platform] || Joi.object().unknown();
};

// Validation helper
const validatePlatformConnection = (platform: string, data: any) => {
  const schema = getPlatformSchema(platform);
  return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

export default {
  baseConnectionSchema,
  instagramConnectSchema,
  facebookConnectSchema,
  tiktokConnectSchema,
  linkedinConnectSchema,
  linkedinOrgConnectSchema,
  youtubeConnectSchema,
  twitterConnectSchema,
  analyticsSyncSchema,
  platformPostIdsSchema,
  platformStatusSchema,
  allPlatformsStatusSchema,
  errorResponseSchema,
  successResponseSchema,
  getPlatformSchema,
  validatePlatformConnection,
};
