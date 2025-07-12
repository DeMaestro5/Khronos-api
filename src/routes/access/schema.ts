import Joi from 'joi';
import { JoiAuthBearer } from '../../helpers/validator';

export default {
  credential: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
  }),
  refreshToken: Joi.object().keys({
    refreshToken: Joi.string().required().min(1),
  }),
  auth: Joi.object()
    .keys({
      authorization: JoiAuthBearer().required(),
    })
    .unknown(true),
  signup: Joi.object().keys({
    firstName: Joi.string().required().min(1),
    lastName: Joi.string().required().min(1),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
    profilePicUrl: Joi.string().optional().uri(),
    role: Joi.string().optional(),
  }),

  forgotPassword: Joi.object().keys({
    email: Joi.string().required().email(),
  }),
  resetPassword: Joi.object().keys({
    code: Joi.string()
      .required()
      .length(5)
      .pattern(/^[A-Z0-9]{5}$/),
    password: Joi.string().required().min(8),
  }),
};
