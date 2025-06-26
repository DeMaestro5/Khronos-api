import Joi from 'joi';

// Base validation patterns that we'll reuse
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const urlPattern = /^https?:\/\/.+/;

//profile validation schema

const profileSchema = Joi.object({
  displayName: Joi.string()
    .trim()
    .max(20)
    .optional()
    .messages({ 'string.max': 'Display name cannot exceed 20 characters' }),

  bio: Joi.string()
    .trim()
    .optional()
    .max(200)
    .allow('')
    .messages({ 'string.max': 'Bio cannot exceed 200 characters' }),

  location: Joi.string()
    .trim()
    .max(100)
    .allow('')
    .optional()
    .messages({ 'string.max': 'Location cannot exceed 100 characters' }),

  website: Joi.string().pattern(urlPattern).allow('').optional().messages({
    'string.pattern.base':
      'Website must be a valid URL starting with http:// or https://',
  }),

  timezone: Joi.string()
    .valid(
      'UTC',
      'EST',
      'PST',
      'GMT',
      'CET',
      'JST',
      'CST',
      'MST',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
    )
    .optional()
    .messages({
      'any.only': 'Invalid timezone',
    }),

  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko')
    .optional()
    .messages({
      'any.only': 'Unsupported language',
    }),

  dateFormat: Joi.string()
    .valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')
    .optional()
    .messages({
      'any.only': 'Invalid date format',
    }),

  timeFormat: Joi.string().valid('12h', '24h').optional().messages({
    'any.only': 'Time format must be either 12h or 24h',
  }),
});

// notification validation schema

const emailNotificationsSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  marketing: Joi.boolean().optional(),
  productUpdates: Joi.boolean().optional(),
  weeklyDigest: Joi.boolean().optional(),
  contentReminders: Joi.boolean().optional(),
});

const pushNotificationsSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  contentPublished: Joi.boolean().optional(),
  trendsAlert: Joi.boolean().optional(),
  collaborationInvites: Joi.boolean().optional(),
});

const inAppNotificationsSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  mentions: Joi.boolean().optional(),
  comments: Joi.boolean().optional(),
  likes: Joi.boolean().optional(),
});

const notificationsSchema = Joi.object({
  email: emailNotificationsSchema.optional(),
  push: pushNotificationsSchema.optional(),
  inApp: inAppNotificationsSchema.optional(),
});

//privacy validation schema

const privacySchema = Joi.object({
  profileVisibility: Joi.string()
    .valid('public', 'private', 'followers')
    .optional()
    .messages({
      'any.only': 'Profile visibility must be public, private or followers',
    }),
  showEmail: Joi.boolean().optional(),
  showLocation: Joi.boolean().optional(),
  allowAnalytics: Joi.boolean().optional(),
  dataSharing: Joi.boolean().optional(),
});

//content validation schema

const contentSchema = Joi.object({
  defaultPlatforms: Joi.array()
    .items(
      Joi.string().valid(
        'twitter',
        'linkedin',
        'facebook',
        'instagram',
        'tiktok',
        'youtube',
      ),
    )
    .min(1)
    .optional()
    .messages({
      'array.min': 'Atleast one default platform must be selected',
      'any.only': 'Invalid platform specified',
    }),

  defaultContentType: Joi.string()
    .valid('article', 'post', 'video')
    .optional()
    .messages({ 'any.only': 'Invalid content type' }),

  autoSave: Joi.boolean().optional(),
  autoScheduling: Joi.boolean().optional(),
  aiSuggestions: Joi.boolean().optional(),

  contentLanguage: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko')
    .optional()
    .messages({
      'any.only': 'Unsupported content language',
    }),
});

//interface validation schema

const interfaceSchema = Joi.object({
  theme: Joi.string()
    .valid('light', 'dark', 'system')
    .optional()
    .messages({ 'any.only': 'There must be light, dark or system' }),

  sidebarCollapsed: Joi.boolean().optional(),
  defaultView: Joi.string()
    .valid('list', 'grid')
    .optional()
    .messages({ 'any.only': 'Default view must be list or grid' }),
  itemsPerPage: Joi.number().integer().min(5).max(100).optional().messages({
    'number.min': 'Items per page must be at least 5',
    'number.max': 'Items per page cannot exceed 100',
  }),

  enableAnimations: Joi.boolean().optional(),
  compactMode: Joi.boolean().optional(),
});

// integration validation schema

const connectedAccountSchema = Joi.object({
  platform: Joi.string().required(),
  accountId: Joi.string().required(),
  accountName: Joi.string().required(),
  isActive: Joi.boolean().default(true),
  permissions: Joi.array().items(Joi.string().default([])),
  connectedAt: Joi.date().default(Date.now),
});

const apiKeySchema = Joi.object({
  name: Joi.string().required(),
  keyId: Joi.string().required(),
  permissions: Joi.array().items(Joi.string()).default([]),
  createdAt: Joi.date().default(Date.now),
  lastUsed: Joi.date().optional(),
  isActive: Joi.boolean().default(true),
});

const integrationsSchema = Joi.object({
  connectedAccounts: Joi.array().items(connectedAccountSchema).optional(),
  apiKeys: Joi.array().items(apiKeySchema).optional(),
});

//Main validation schema for different endpoints

const updateSettings = Joi.object({
  profile: profileSchema.optional(),
  notifications: notificationsSchema.optional(),
  privacy: privacySchema.optional(),
  content: contentSchema.optional(),
  interface: interfaceSchema.optional(),
  integrations: integrationsSchema.optional(),
})
  .min(1)
  .messages({ 'object.min': 'At least one setting section must be provided' });

const updateProfile = profileSchema
  .min(1)
  .messages({ 'object.min': ' Atleast one profile field must be provided' });

const updateNotifications = notificationsSchema.min(1).messages({
  'object.min': 'Atleast one notification field must be provided',
});

const updatePrivacy = privacySchema
  .min(1)
  .messages({ 'object.min': 'Atleast one privacy field must be provided' });

const updateContent = contentSchema
  .min(1)
  .messages({ 'object.min': 'Atleast one content setting must be provided' });

const updateInterface = interfaceSchema.min(1).messages({
  'object.min': 'At least one interface setting must be provided',
});

const updateTheme = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'auto').required().messages({
    'any.only': 'Theme must be light, dark, or auto',
    'any.required': 'Theme is required',
  }),
});
const addConnectedAccount = Joi.object({
  platform: Joi.string()
    .valid(
      'twitter',
      'linkedin',
      'facebook',
      'instagram',
      'tiktok',
      'youtube',
      'google',
    )
    .required()
    .messages({
      'any.only': 'Invalid platform',
      'any.required': 'Platform is required',
    }),

  accountId: Joi.string().required().messages({
    'any.required': 'Account ID is required',
  }),

  accountName: Joi.string().required().messages({
    'any.required': 'Account name is required',
  }),

  permissions: Joi.array()
    .items(Joi.string().valid('read', 'write', 'delete'))
    .default(['read'])
    .messages({
      'any.only': 'Invalid permission type',
    }),
});

const createApiKey = Joi.object({
  name: Joi.string().trim().min(3).max(50).required().messages({
    'string.min': 'API key name must be at least 3 characters',
    'string.max': 'API key name cannot exceed 50 characters',
    'any.required': 'API key name is required',
  }),

  permissions: Joi.array()
    .items(Joi.string().valid('read', 'write', 'admin'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission must be specified',
      'any.only': 'Invalid permission type',
      'any.required': 'Permissions are required',
    }),
});

const adminGetUsers = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  userId: Joi.string().pattern(objectIdPattern).optional(),
  createdAfter: Joi.date().optional(),
  updatedAfter: Joi.date().optional(),
});

export default {
  updateSettings,
  updateProfile,
  updateNotifications,
  updatePrivacy,
  updateContent,
  updateInterface,
  updateTheme,
  addConnectedAccount,
  createApiKey,
  adminGetUsers,
};
