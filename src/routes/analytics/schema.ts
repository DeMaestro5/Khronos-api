import Joi from 'joi';

export default {
  contentAnalytics: Joi.object().keys({
    params: Joi.object().keys({
      id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          'string.pattern.base': 'Content ID must be a valid MongoDB ObjectId',
          'any.required': 'Content ID is required',
        }),
    }),
  }),

  performanceAnalytics: Joi.object().keys({
    params: Joi.object().keys({
      period: Joi.string()
        .valid('week', 'month', 'quarter', 'year')
        .required()
        .messages({
          'any.only': 'Period must be one of: week, month, quarter, year',
          'any.required': 'Period is required',
        }),
    }),
  }),

  exportAnalytics: Joi.object().keys({
    params: Joi.object().keys({
      type: Joi.string()
        .valid('overview', 'performance', 'audience', 'engagement')
        .required()
        .messages({
          'any.only':
            'Export type must be one of: overview, performance, audience, engagement',
          'any.required': 'Export type is required',
        }),
    }),
    query: Joi.object().keys({
      format: Joi.string()
        .valid('json', 'csv')
        .optional()
        .default('json')
        .messages({
          'any.only': 'Format must be json or csv',
        }),
    }),
  }),

  realTimeAnalytics: Joi.object().keys({
    body: Joi.object().keys({
      contentIds: Joi.array()
        .items(
          Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
        )
        .optional()
        .messages({
          'string.pattern.base':
            'Each content ID must be a valid MongoDB ObjectId',
        }),
      platforms: Joi.array()
        .items(
          Joi.string().valid(
            'instagram',
            'youtube',
            'tiktok',
            'linkedin',
            'twitter',
            'facebook',
            'pinterest',
            'snapchat',
          ),
        )
        .optional()
        .messages({
          'any.only':
            'Each platform must be one of: instagram, youtube, tiktok, linkedin, twitter, facebook, pinterest, snapchat',
        }),
      metrics: Joi.array()
        .items(
          Joi.string().valid(
            'engagement',
            'reach',
            'impressions',
            'clicks',
            'shares',
            'saves',
            'comments',
            'likes',
            'views',
          ),
        )
        .optional()
        .messages({
          'any.only':
            'Each metric must be one of: engagement, reach, impressions, clicks, shares, saves, comments, likes, views',
        }),
    }),
  }),

  compareAnalytics: Joi.object().keys({
    body: Joi.object()
      .keys({
        contentIds: Joi.array()
          .items(
            Joi.string()
              .pattern(/^[0-9a-fA-F]{24}$/)
              .required(),
          )
          .min(2)
          .optional()
          .messages({
            'string.pattern.base':
              'Each content ID must be a valid MongoDB ObjectId',
            'array.min': 'At least 2 content IDs are required for comparison',
          }),
        timeRanges: Joi.array()
          .items(Joi.string().valid('week', 'month', 'quarter', 'year'))
          .min(2)
          .optional()
          .messages({
            'any.only':
              'Each time range must be one of: week, month, quarter, year',
            'array.min': 'At least 2 time ranges are required for comparison',
          }),
        platforms: Joi.array()
          .items(
            Joi.string().valid(
              'instagram',
              'youtube',
              'tiktok',
              'linkedin',
              'twitter',
              'facebook',
              'pinterest',
              'snapchat',
            ),
          )
          .optional()
          .messages({
            'any.only':
              'Each platform must be one of: instagram, youtube, tiktok, linkedin, twitter, facebook, pinterest, snapchat',
          }),
      })
      .or('contentIds', 'timeRanges')
      .messages({
        'object.missing':
          'Either contentIds or timeRanges must be provided for comparison',
      }),
  }),

  // Enhanced schema for trend analysis
  trendAnalytics: Joi.object().keys({
    body: Joi.object().keys({
      startDate: Joi.date().iso().max('now').optional().messages({
        'date.max': 'Start date cannot be in the future',
      }),
      endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .max('now')
        .optional()
        .messages({
          'date.min': 'End date must be after start date',
          'date.max': 'End date cannot be in the future',
        }),
      granularity: Joi.string()
        .valid('hour', 'day', 'week', 'month')
        .optional()
        .default('day')
        .messages({
          'any.only': 'Granularity must be one of: hour, day, week, month',
        }),
      platforms: Joi.array()
        .items(
          Joi.string().valid(
            'instagram',
            'youtube',
            'tiktok',
            'linkedin',
            'twitter',
            'facebook',
            'pinterest',
            'snapchat',
          ),
        )
        .optional(),
      contentTypes: Joi.array()
        .items(
          Joi.string().valid(
            'article',
            'video',
            'social',
            'podcast',
            'blog_post',
            'newsletter',
          ),
        )
        .optional(),
    }),
  }),

  // Schema for competitive analysis
  competitiveAnalytics: Joi.object().keys({
    body: Joi.object().keys({
      industry: Joi.string().min(2).max(50).optional().messages({
        'string.min': 'Industry must be at least 2 characters',
        'string.max': 'Industry cannot exceed 50 characters',
      }),
      competitors: Joi.array()
        .items(Joi.string().min(2).max(100))
        .max(10)
        .optional()
        .messages({
          'array.max': 'Maximum 10 competitors allowed',
          'string.min': 'Competitor name must be at least 2 characters',
          'string.max': 'Competitor name cannot exceed 100 characters',
        }),
      metrics: Joi.array()
        .items(
          Joi.string().valid(
            'engagement_rate',
            'follower_growth',
            'content_frequency',
            'reach',
            'impressions',
          ),
        )
        .optional(),
      platforms: Joi.array()
        .items(
          Joi.string().valid(
            'instagram',
            'youtube',
            'tiktok',
            'linkedin',
            'twitter',
            'facebook',
          ),
        )
        .optional(),
    }),
  }),

  // Schema for ROI analysis
  roiAnalytics: Joi.object().keys({
    body: Joi.object().keys({
      campaignId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .optional()
        .messages({
          'string.pattern.base': 'Campaign ID must be a valid MongoDB ObjectId',
        }),
      startDate: Joi.date().iso().required().messages({
        'any.required': 'Start date is required for ROI calculation',
      }),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
        'date.min': 'End date must be after start date',
        'any.required': 'End date is required for ROI calculation',
      }),
      investment: Joi.number().positive().optional().messages({
        'number.positive': 'Investment amount must be positive',
      }),
      currency: Joi.string()
        .length(3)
        .uppercase()
        .optional()
        .default('USD')
        .messages({
          'string.length':
            'Currency must be a 3-letter ISO code (e.g., USD, EUR)',
        }),
      goals: Joi.array()
        .items(
          Joi.string().valid(
            'brand_awareness',
            'lead_generation',
            'sales',
            'engagement',
            'reach',
          ),
        )
        .optional(),
    }),
  }),

  // Schema for predictive analytics
  predictiveAnalytics: Joi.object().keys({
    body: Joi.object().keys({
      contentType: Joi.string()
        .valid(
          'article',
          'video',
          'social',
          'podcast',
          'blog_post',
          'newsletter',
        )
        .required()
        .messages({
          'any.only':
            'Content type must be one of: article, video, social, podcast, blog_post, newsletter',
          'any.required': 'Content type is required for predictions',
        }),
      platform: Joi.string()
        .valid(
          'instagram',
          'youtube',
          'tiktok',
          'linkedin',
          'twitter',
          'facebook',
        )
        .required()
        .messages({
          'any.required': 'Platform is required for predictions',
        }),
      contentText: Joi.string().min(10).max(5000).optional().messages({
        'string.min': 'Content text must be at least 10 characters',
        'string.max': 'Content text cannot exceed 5000 characters',
      }),
      tags: Joi.array()
        .items(Joi.string().min(1).max(50))
        .max(20)
        .optional()
        .messages({
          'array.max': 'Maximum 20 tags allowed',
          'string.max': 'Each tag cannot exceed 50 characters',
        }),
      scheduledTime: Joi.date().iso().min('now').optional().messages({
        'date.min': 'Scheduled time must be in the future',
      }),
      targetAudience: Joi.object()
        .keys({
          ageRange: Joi.string()
            .valid('18-24', '25-34', '35-44', '45-54', '55+')
            .optional(),
          gender: Joi.string().valid('male', 'female', 'all').optional(),
          location: Joi.string().min(2).max(100).optional(),
          interests: Joi.array()
            .items(Joi.string().min(2).max(50))
            .max(10)
            .optional(),
        })
        .optional(),
    }),
  }),

  // Advanced filtering schema
  analyticsFilter: Joi.object().keys({
    query: Joi.object().keys({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
      platforms: Joi.string().optional(), // Comma-separated string
      contentTypes: Joi.string().optional(), // Comma-separated string
      tags: Joi.string().optional(), // Comma-separated string
      status: Joi.string()
        .valid('draft', 'scheduled', 'published', 'archived')
        .optional(),
      sortBy: Joi.string()
        .valid('date', 'engagement', 'reach', 'performance_score')
        .optional()
        .default('date'),
      sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
      limit: Joi.number().integer().min(1).max(100).optional().default(20),
      offset: Joi.number().integer().min(0).optional().default(0),
    }),
  }),
};
