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
      .valid('article', 'video', 'social', 'podcast')
      .required(),
    platform: Joi.array().items(Joi.string()).required(),
    tags: Joi.array().items(Joi.string()),
    scheduledDate: Joi.date().iso(),
  }),

  update: Joi.object({
    title: Joi.string().max(200),
    description: Joi.string(),
    type: Joi.string().valid('article', 'video', 'social', 'podcast'),
    platform: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    scheduledDate: Joi.date().iso(),
  }),
};
