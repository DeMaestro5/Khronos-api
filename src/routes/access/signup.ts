import express from 'express';
import { SuccessResponse } from '../../core/ApiResponse';
import { RoleRequest } from 'app-request';
import crypto from 'crypto';
import UserRepo from '../../database/repository/UserRepo';
import { BadRequestError } from '../../core/ApiError';
import User from '../../database/model/User';
import { createTokens } from '../../auth/authUtils';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import bcrypt from 'bcrypt';
import { RoleCode } from '../../database/model/Role';
import { getUserData } from './utils';

const router = express.Router();

router.post(
  '/basic',
  validator(schema.signup),
  asyncHandler(async (req: RoleRequest, res) => {
    const user = await UserRepo.findByEmail(req.body.email);
    if (user) throw new BadRequestError('User already registered');

    const accessTokenKey = crypto.randomBytes(64).toString('hex');
    const refreshTokenKey = crypto.randomBytes(64).toString('hex');
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    // Use role from request body or default to CONTENT_CREATOR
    const role = req.body.role || RoleCode.CONTENT_CREATOR;

    const { user: createdUser, keystore } = await UserRepo.create(
      {
        name: req.body.name,
        email: req.body.email,
        profilePicUrl: req.body.profilePicUrl,
        password: passwordHash,
      } as User,
      accessTokenKey,
      refreshTokenKey,
      role,
    );

    const tokens = await createTokens(
      createdUser,
      keystore.primaryKey,
      keystore.secondaryKey,
    );

    const userData = await getUserData(createdUser);

    new SuccessResponse('Signup Successful', {
      user: userData,
      tokens: tokens,
      role: role,
    }).send(res);
  }),
);

export default router;
