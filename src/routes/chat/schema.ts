import Joi from 'joi';

export default {
  // Start new chat session
  startSession: Joi.object({
    title: Joi.string().required().max(200),
    description: Joi.string().max(500),
    contentId: Joi.string().optional(),
    templateId: Joi.string().optional(),
    settings: Joi.object({
      model: Joi.string()
        .valid('gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo')
        .default('gpt-4o-mini'),
      temperature: Joi.number().min(0).max(2).default(0.7),
      maxTokens: Joi.number().min(1).max(4000).default(1000),
    }).optional(),
  }),

  // Send message
  sendMessage: Joi.object({
    message: Joi.string().required().max(4000),
    sessionId: Joi.string().required(),
  }),

  // Session ID parameter
  sessionId: Joi.object({
    id: Joi.string().required(),
  }),

  // Get sessions with filters
  getSessions: Joi.object({
    status: Joi.string().valid('active', 'archived', 'completed').optional(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    skip: Joi.number().integer().min(0).default(0),
    contentId: Joi.string().optional(),
  }),

  // Generate content from session
  generateContent: Joi.object({
    contentType: Joi.string()
      .valid('article', 'video', 'social', 'podcast', 'newsletter', 'blog_post')
      .required(),
    platform: Joi.array().items(Joi.string()).min(1).required(),
    title: Joi.string().max(200).optional(),
  }),

  // Get templates
  getTemplates: Joi.object({
    category: Joi.string()
      .valid(
        'content-optimization',
        'content-creation',
        'strategy',
        'analysis',
        'custom',
      )
      .optional(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().max(100).optional(),
  }),

  // Save session as template
  saveTemplate: Joi.object({
    name: Joi.string().required().max(100),
    description: Joi.string().required().max(300),
    category: Joi.string()
      .valid(
        'content-optimization',
        'content-creation',
        'strategy',
        'analysis',
        'custom',
      )
      .required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
    isPublic: Joi.boolean().default(false),
  }),

  // Create template
  createTemplate: Joi.object({
    name: Joi.string().required().max(100),
    description: Joi.string().required().max(300),
    category: Joi.string()
      .valid(
        'content-optimization',
        'content-creation',
        'strategy',
        'analysis',
        'custom',
      )
      .required(),
    systemPrompt: Joi.string().required().max(2000),
    tags: Joi.array().items(Joi.string().max(50)).max(10).default([]),
    isPublic: Joi.boolean().default(false),
    settings: Joi.object({
      model: Joi.string()
        .valid('gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo')
        .default('gpt-4o-mini'),
      temperature: Joi.number().min(0).max(2).default(0.7),
      maxTokens: Joi.number().min(1).max(4000).default(1000),
    }).optional(),
    initialMessages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('user', 'assistant', 'system').required(),
          content: Joi.string().required().max(2000),
        }),
      )
      .max(10)
      .optional(),
  }),

  // Update session
  updateSession: Joi.object({
    title: Joi.string().max(200).optional(),
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    status: Joi.string().valid('active', 'archived', 'completed').optional(),
    settings: Joi.object({
      model: Joi.string().valid('gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'),
      temperature: Joi.number().min(0).max(2),
      maxTokens: Joi.number().min(1).max(4000),
      systemPrompt: Joi.string().max(2000),
    }).optional(),
  }),

  // Template ID parameter
  templateId: Joi.object({
    id: Joi.string().required(),
  }),
};
