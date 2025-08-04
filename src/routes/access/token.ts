import express from 'express';
import { TokenRefreshResponse } from '../../core/ApiResponse';
import { ProtectedRequest } from 'app-request';
import { Types } from 'mongoose';
import UserRepo from '../../database/repository/UserRepo';
import { AuthFailureError } from '../../core/ApiError';
import JWT from '../../core/JWT';
import KeystoreRepo from '../../database/repository/KeystoreRepo';
import crypto from 'crypto';
import {
  validateTokenData,
  createTokens,
  getAccessToken,
} from '../../auth/authUtils';
import validator, { ValidationSource } from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import { tokenInfo } from '../../config';

const router = express.Router();

router.post(
  '/refresh',
  validator(schema.auth, ValidationSource.HEADER),
  validator(schema.refreshToken),
  asyncHandler(async (req: ProtectedRequest, res) => {
    req.accessToken = getAccessToken(req.headers.authorization); // Express headers are auto converted to lowercase

    const accessTokenPayload = await JWT.decode(req.accessToken);
    validateTokenData(accessTokenPayload);

    const user = await UserRepo.findById(
      new Types.ObjectId(accessTokenPayload.sub),
    );
    if (!user) throw new AuthFailureError('User not registered');
    req.user = user;

    const refreshTokenPayload = await JWT.validate(req.body.refreshToken);
    validateTokenData(refreshTokenPayload);

    if (accessTokenPayload.sub !== refreshTokenPayload.sub)
      throw new AuthFailureError('Invalid access token');

    const keystore = await KeystoreRepo.find(
      req.user,
      accessTokenPayload.prm,
      refreshTokenPayload.prm,
    );

    if (!keystore) throw new AuthFailureError('Invalid access token');
    await KeystoreRepo.remove(keystore._id);

    // Determine if this was a remember me token by checking the expiration time
    // Remember me tokens have longer validity (30 days vs 7 days)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = refreshTokenPayload.exp - currentTime;
    const rememberMeThreshold =
      tokenInfo.rememberMeRefreshTokenValidity - tokenInfo.refreshTokenValidity;
    const isRememberMeToken = timeUntilExpiry > rememberMeThreshold;

    const accessTokenKey = crypto.randomBytes(64).toString('hex');
    const refreshTokenKey = crypto.randomBytes(64).toString('hex');

    await KeystoreRepo.create(req.user, accessTokenKey, refreshTokenKey);
    const tokens = await createTokens(
      req.user,
      accessTokenKey,
      refreshTokenKey,
      isRememberMeToken, // Pass the remember me state
    );

    new TokenRefreshResponse(
      'Token Issued',
      tokens.accessToken,
      tokens.refreshToken,
      tokens.accessTokenExpiresIn,
      tokens.refreshTokenExpiresIn,
      tokens.isRememberMe,
    ).send(res);
  }),
);

export default router;
