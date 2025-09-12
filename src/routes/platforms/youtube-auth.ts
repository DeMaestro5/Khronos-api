import express from 'express';
import passport from 'passport';
import asyncHandler from '../../helpers/asyncHandler';

import { deactivate } from '../../database/repository/PlatformConnectionRepo';
import { SuccessResponse } from '../../core/ApiResponse';
import { requireUser } from '../../middleware/requireUser';
import { makeState } from '../../auth/state';

import { Types } from 'mongoose';
import '../../auth/passport-google-link';
import { getPlatformCredentials } from '../../database/repository/PlatformConnectionRepo';
import { ProtectedRequest } from '../../types/app-request';

const router = express.Router();

router.get(
  '/connect',
  requireUser,
  asyncHandler(async (req: ProtectedRequest, res, next) => {
    const state = makeState(req.appUser!.id);
    (passport.authenticate as any)('google-link', {
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
      ],
      accessType: 'offline',
      prompt: 'consent',
      session: false,
      state,
    })(req, res, next);
  }),
);

router.delete(
  '/disconnect',
  requireUser,
  asyncHandler(async (req: ProtectedRequest, res) => {
    await deactivate(new Types.ObjectId(req.appUser!.id), 'youtube');
    new SuccessResponse('Youtube disconnected successfully', {
      platform: 'youtube',
    }).send(res);
  }),
);

router.get(
  '/status',
  requireUser,
  asyncHandler(async (req: ProtectedRequest, res) => {
    const creds = await getPlatformCredentials(
      new Types.ObjectId(req.appUser!.id),
      'youtube',
    );
    const connected = !!(
      creds &&
      (creds.accessTokenEnc || creds.refreshTokenEnc)
    );
    new SuccessResponse('YouTube connection status', {
      connected,
      hasAccessToken: !!creds?.accessTokenEnc,
      hasRefreshToken: !!creds?.refreshTokenEnc,
      channelId: creds?.channelId,
      accountId: creds?.accountId,
      permissions: creds?.permissions,
    }).send(res);
  }),
);

export default router;
