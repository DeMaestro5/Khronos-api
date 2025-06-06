import Joi from 'joi';

export default {
  // Basic ID validation
  id: Joi.object({
    id: Joi.string().required(),
  }),

  // Date parameters
  yearMonth: Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(0).max(11).required(),
  }),

  yearMonthDay: Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required(),
    month: Joi.number().integer().min(0).max(11).required(),
    day: Joi.number().integer().min(1).max(31).required(),
  }),

  // Create calendar event
  createEvent: Joi.object({
    title: Joi.string().required().max(200).trim(),
    description: Joi.string().max(1000).trim(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    allDay: Joi.boolean().default(false),
    timezone: Joi.string().default('UTC'),
    location: Joi.string().max(200).trim(),
    eventType: Joi.string()
      .valid('content_publishing', 'meeting', 'reminder', 'deadline', 'custom')
      .default('custom'),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .default('medium'),

    // Content association
    contentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    platform: Joi.array().items(Joi.string()),

    // Scheduling & automation
    autoPublish: Joi.boolean().default(false),
    publishSettings: Joi.object({
      platforms: Joi.array().items(Joi.string()),
      optimizeForEngagement: Joi.boolean().default(true),
      crossPost: Joi.boolean().default(false),
    }),

    // Recurrence
    recurrence: Joi.object({
      frequency: Joi.string()
        .valid('daily', 'weekly', 'monthly', 'yearly', 'custom')
        .required(),
      interval: Joi.number().integer().min(1).default(1),
      daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)),
      endDate: Joi.date().iso(),
      occurrences: Joi.number().integer().min(1),
    }),

    // Reminders
    reminders: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('email', 'push', 'webhook').required(),
        time: Joi.number().integer().min(0).required(),
      }),
    ),

    // Collaboration
    attendees: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),

    // Metadata
    tags: Joi.array().items(Joi.string().trim()),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .default('#3B82F6'),
    notes: Joi.string().max(2000).trim(),
  }),

  // Update calendar event
  updateEvent: Joi.object({
    title: Joi.string().max(200).trim(),
    description: Joi.string().max(1000).trim(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    allDay: Joi.boolean(),
    timezone: Joi.string(),
    location: Joi.string().max(200).trim(),
    eventType: Joi.string().valid(
      'content_publishing',
      'meeting',
      'reminder',
      'deadline',
      'custom',
    ),
    status: Joi.string().valid(
      'scheduled',
      'published',
      'cancelled',
      'completed',
      'failed',
    ),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),

    // Content association
    contentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    platform: Joi.array().items(Joi.string()),

    // Scheduling & automation
    autoPublish: Joi.boolean(),
    publishSettings: Joi.object({
      platforms: Joi.array().items(Joi.string()),
      optimizeForEngagement: Joi.boolean(),
      crossPost: Joi.boolean(),
    }),

    // Recurrence
    recurrence: Joi.object({
      frequency: Joi.string().valid(
        'daily',
        'weekly',
        'monthly',
        'yearly',
        'custom',
      ),
      interval: Joi.number().integer().min(1),
      daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)),
      endDate: Joi.date().iso(),
      occurrences: Joi.number().integer().min(1),
    }),

    // Reminders
    reminders: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('email', 'push', 'webhook').required(),
        time: Joi.number().integer().min(0).required(),
      }),
    ),

    // Collaboration
    attendees: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),

    // Metadata
    tags: Joi.array().items(Joi.string().trim()),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
    notes: Joi.string().max(2000).trim(),
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

  // Bulk update events (for drag-drop functionality)
  bulkUpdate: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          id: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
          startDate: Joi.date().iso(),
          endDate: Joi.date().iso(),
          title: Joi.string().max(200).trim(),
          status: Joi.string().valid(
            'scheduled',
            'published',
            'cancelled',
            'completed',
            'failed',
          ),
          priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
          color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
        }),
      )
      .min(1)
      .required(),
  }),

  // Query parameters for filtering
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    eventType: Joi.string().valid(
      'content_publishing',
      'meeting',
      'reminder',
      'deadline',
      'custom',
    ),
    status: Joi.string().valid(
      'scheduled',
      'published',
      'cancelled',
      'completed',
      'failed',
    ),
    platform: Joi.string(),
  }),

  // Optimal times request
  optimalTimes: Joi.object({
    contentType: Joi.string().valid(
      'article',
      'video',
      'social',
      'podcast',
      'newsletter',
      'blog_post',
    ),
    platform: Joi.array().items(Joi.string()),
    timezone: Joi.string().default('UTC'),
    dateRange: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    }),
    targetAudience: Joi.string(),
    excludeWeekends: Joi.boolean().default(false),
    minHour: Joi.number().integer().min(0).max(23).default(6),
    maxHour: Joi.number().integer().min(0).max(23).default(22),
  })
    .custom((value, helpers) => {
      if (value.minHour >= value.maxHour) {
        return helpers.error('custom.hourRange');
      }
      return value;
    })
    .messages({
      'custom.hourRange': 'Max hour must be greater than min hour',
    }),
};
