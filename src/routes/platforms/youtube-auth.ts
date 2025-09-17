import express from 'express';
import passport from 'passport';
import asyncHandler from '../../helpers/asyncHandler';

import { deactivate } from '../../database/repository/PlatformConnectionRepo';
import { BadRequestResponse, SuccessResponse } from '../../core/ApiResponse';
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

// youtube status route
router.get(
  '/status',
  requireUser,
  asyncHandler(async (req, res) => {
    const userId = req.appUser!.id;
    if (!userId) {
      return new BadRequestResponse('User not found').send(res);
    }
    if (!Types.ObjectId.isValid(userId)) {
      return new BadRequestResponse('Invalid user id').send(res);
    }
    let creds: Awaited<ReturnType<typeof getPlatformCredentials>> | null = null;
    try {
      creds = await getPlatformCredentials(
        new Types.ObjectId(userId),
        'youtube',
      );
    } catch (e) {
      return new BadRequestResponse('Error getting platform credentials').send(
        res,
      );
    }

    const connected = !!(
      creds &&
      (creds.accessTokenEnc || creds.refreshTokenEnc)
    );
    return new SuccessResponse('YouTube connection status', {
      connected,
      isConnected: connected,
      hasAccessToken: !!creds?.accessTokenEnc,
      hasRefreshToken: !!creds?.refreshTokenEnc,
      channelId: creds?.channelId,
      accountId: creds?.accountId,
      permissions: creds?.permissions,
    }).send(res);
  }),
);

export default router;
