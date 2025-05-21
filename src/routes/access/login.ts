import express from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import { PublicRequest } from '../../types/app-request';
import AuthService from '../../services/Auth Services/auth-service';

const router = express.Router();

router.post(
  '/',
  validator(schema.credential),
  asyncHandler(async (req: PublicRequest, res) => {
    const { user, tokens } = await AuthService.login({
      email: req.body.email,
      password: req.body.password,
    });

    new SuccessResponse('Login Success', {
      user,
      tokens,
    }).send(res);
  }),
);

export default router;
