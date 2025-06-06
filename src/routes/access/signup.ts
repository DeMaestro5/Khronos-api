import express from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { RoleRequest } from 'app-request';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import { UserRole } from '../../database/model/User';
import AuthService from '../../services/Auth Services/auth-service';

const router = express.Router();

router.post(
  '/',
  validator(schema.signup),
  asyncHandler(async (req: RoleRequest, res) => {
    const { user, tokens } = await AuthService.signup({
      name: `${req.body.firstName} ${req.body.lastName}`,
      email: req.body.email,
      password: req.body.password,
      profilePicUrl: req.body.profilePicUrl,
      role: req.body.role || UserRole.CONTENT_CREATOR,
    });

    new SuccessResponse('Signup Successful', {
      user,
      tokens,
    }).send(res);
  }),
);

export default router;
