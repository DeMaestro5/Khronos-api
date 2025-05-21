import Joi from 'joi';
import { JoiObjectId } from '../../helpers/validator';

export default {
  profile: Joi.object().keys({
    name: Joi.string().min(1).max(200).optional(),
    profilePicUrl: Joi.string().uri().optional(),
  }),
  id: Joi.object().keys({
    id: JoiObjectId().required(),
  }),
  email: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};
