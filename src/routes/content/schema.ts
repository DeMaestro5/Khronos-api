import Joi from 'joi';

export default {
  id: Joi.object({
    id: Joi.string().required(),
  }),

  userId: Joi.object({
    userId: Joi.string().required(),
  }),

  type: Joi.object({
    type: Joi.string()
      .valid('article', 'video', 'social', 'podcast')
      .required(),
  }),

  platform: Joi.object({
    platform: Joi.string().required(),
  }),

  tags: Joi.object({
    tags: Joi.array().items(Joi.string()).required(),
  }),

  status: Joi.object({
    status: Joi.string().valid('draft', 'scheduled', 'published').required(),
  }),

  recommendations: Joi.object({
    platform: Joi.string().required(),
    contentType: Joi.string()
      .valid('article', 'video', 'social', 'podcast')
      .required(),
    limit: Joi.number().integer().min(1).max(20).default(5),
  }),

  patterns: Joi.object({
    platform: Joi.string().required(),
    contentType: Joi.string()
      .valid('article', 'video', 'social', 'podcast')
      .required(),
  }),

  create: Joi.object({
    title: Joi.string().required().max(200),
    description: Joi.string(),
    type: Joi.string()
      .valid('article', 'video', 'social', 'podcast', 'newsletter', 'blog_post')
      .required(),
    platform: Joi.array().items(Joi.string()).required(),
    tags: Joi.array().items(Joi.string()),

    // Priority field for calendar event (from your form)
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .default('medium'),

    // Enhanced scheduling object for automatic calendar event creation
    scheduling: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')),
      timezone: Joi.string().default('UTC'),
      allDay: Joi.boolean().default(false),
      autoPublish: Joi.boolean().default(false),
      priority: Joi.string()
        .valid('low', 'medium', 'high', 'critical')
        .default('medium'),

      // Cross-platform scheduling - different times for different platforms
      platformSchedules: Joi.array().items(
        Joi.object({
          platform: Joi.string().required(),
          scheduledDate: Joi.date().iso().required(),
          customContent: Joi.string(), // Platform-specific optimized content
          autoPublish: Joi.boolean().default(false),
        }),
      ),

      // Recurrence for recurring content (like daily social posts)
      recurrence: Joi.object({
        frequency: Joi.string()
          .valid('daily', 'weekly', 'monthly', 'yearly')
          .required(),
        interval: Joi.number().integer().min(1).default(1),
        daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)), // For weekly recurrence
        endDate: Joi.date().iso(),
        occurrences: Joi.number().integer().min(1),
      }),

      // Reminders for content creators
      reminders: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('email', 'push', 'webhook').required(),
          time: Joi.number().integer().min(0).required(), // minutes before start
        }),
      ),

      // Publishing settings
      publishSettings: Joi.object({
        optimizeForEngagement: Joi.boolean().default(true),
        crossPost: Joi.boolean().default(false),
        includeHashtags: Joi.boolean().default(true),
        mentionInfluencers: Joi.boolean().default(false),
      }),

      // AI optimization preferences
      aiOptimization: Joi.object({
        useOptimalTimes: Joi.boolean().default(true),
        adjustForAudience: Joi.boolean().default(true),
        avoidCompetitorPosts: Joi.boolean().default(true),
      }),
    }),

    // Legacy field for backward compatibility (will be moved to scheduling.startDate)
    scheduledDate: Joi.date().iso(),
  }),

  update: Joi.object({
    title: Joi.string().max(200),
    description: Joi.string(),
    type: Joi.string().valid(
      'article',
      'video',
      'social',
      'podcast',
      'newsletter',
      'blog_post',
    ),
    platform: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),

    // Priority field for calendar event updates
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),

    // Enhanced scheduling update
    scheduling: Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      timezone: Joi.string(),
      allDay: Joi.boolean(),
      autoPublish: Joi.boolean(),

      platformSchedules: Joi.array().items(
        Joi.object({
          platform: Joi.string().required(),
          scheduledDate: Joi.date().iso().required(),
          customContent: Joi.string(),
          autoPublish: Joi.boolean(),
        }),
      ),

      recurrence: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly'),
        interval: Joi.number().integer().min(1),
        daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)),
        endDate: Joi.date().iso(),
        occurrences: Joi.number().integer().min(1),
      }),

      reminders: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('email', 'push', 'webhook').required(),
          time: Joi.number().integer().min(0).required(),
        }),
      ),

      publishSettings: Joi.object({
        optimizeForEngagement: Joi.boolean(),
        crossPost: Joi.boolean(),
        includeHashtags: Joi.boolean(),
        mentionInfluencers: Joi.boolean(),
      }),

      aiOptimization: Joi.object({
        useOptimalTimes: Joi.boolean(),
        adjustForAudience: Joi.boolean(),
        avoidCompetitorPosts: Joi.boolean(),
      }),
    })
      .custom((value, helpers) => {
        // Custom validation for startDate and endDate relationship
        if (
          value.startDate &&
          value.endDate &&
          value.startDate >= value.endDate
        ) {
          return helpers.error('custom.dateRange');
        }
        return value;
      })
      .messages({
        'custom.dateRange': 'End date must be after start date',
      }),

    // Legacy field for backward compatibility
    scheduledDate: Joi.date().iso(),
  }),

  schedule: Joi.object({
    scheduledDate: Joi.date().iso().required(),
  }),

  priority: Joi.object({
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .required(),
  }),

  updateSchedule: Joi.object({
    // Enhanced scheduling object for updating scheduling details
    scheduling: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')),
      timezone: Joi.string().default('UTC'),
      allDay: Joi.boolean().default(false),
      autoPublish: Joi.boolean().default(false),
      priority: Joi.string()
        .valid('low', 'medium', 'high', 'critical')
        .default('medium'),

      // Cross-platform scheduling - different times for different platforms
      platformSchedules: Joi.array().items(
        Joi.object({
          platform: Joi.string().required(),
          scheduledDate: Joi.date().iso().required(),
          customContent: Joi.string(), // Platform-specific optimized content
          autoPublish: Joi.boolean().default(false),
        }),
      ),

      // Recurrence for recurring content (like daily social posts)
      recurrence: Joi.object({
        frequency: Joi.string()
          .valid('daily', 'weekly', 'monthly', 'yearly')
          .required(),
        interval: Joi.number().integer().min(1).default(1),
        daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)), // For weekly recurrence
        endDate: Joi.date().iso(),
        occurrences: Joi.number().integer().min(1),
      }),

      // Reminders for content creators
      reminders: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('email', 'push', 'webhook').required(),
          time: Joi.number().integer().min(0).required(), // minutes before start
        }),
      ),

      // Publishing settings
      publishSettings: Joi.object({
        optimizeForEngagement: Joi.boolean().default(true),
        crossPost: Joi.boolean().default(false),
        includeHashtags: Joi.boolean().default(true),
        mentionInfluencers: Joi.boolean().default(false),
      }),

      // AI optimization preferences
      aiOptimization: Joi.object({
        useOptimalTimes: Joi.boolean().default(true),
        adjustForAudience: Joi.boolean().default(true),
        avoidCompetitorPosts: Joi.boolean().default(true),
      }),
    }),

    // Legacy field for backward compatibility (will be converted to scheduling format)
    scheduledDate: Joi.date().iso(),

    // Priority field for calendar event
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .default('medium'),
  })
    .xor('scheduling', 'scheduledDate') // Either scheduling object OR scheduledDate, but not both
    .messages({
      'object.xor':
        'Provide either scheduling object or scheduledDate, but not both',
    }),
};
