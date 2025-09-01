import express from 'express';
import passport from 'passport';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';

import {
  upsertConnection,
  deactivate,
} from '../../database/repository/PlatformConnectionRepo';
import { SuccessResponse } from '../../core/ApiResponse';

const router = express.Router();

router.get(
  '/connect',
  passport.authenticate('google', {
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    accessType: 'offline',
    prompt: 'consent',
  }),
);

router.get(
  '/callback',
  passport.authenticate('google', { session: false }),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { accessToken, refreshToken, channelId, channelTitle, expiresIn } =
      req.query as any;

    // Guard: we must have an app user from requireUser middleware
    if (!req.user) {
      return res.redirect(
        `${
          process.env.FRONTEND_URL || 'http://localhost:3000'
        }/integrations?platform=youtube&success=0&reason=no_app_user`,
      );
    }

    // Persist connection to the current app user (NOT logging in as Google user)
    await upsertConnection((req.user as any).id, 'youtube', {
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresIn
        ? new Date(Date.now() + Number(expiresIn) * 1000)
        : undefined,
      accountId: channelId,
      accountName: channelTitle,
      permissions: ['read', 'insights'],
      accountInfo: {
        url: channelId ? `https://youtube.com/channel/${channelId}` : undefined,
      },
    });

    // Redirect back to the frontend with success flag
    return res.redirect(
      `${
        process.env.FRONTEND_URL || 'http://localhost:3000'
      }/integrations?platform=youtube&success=1`,
    );
  }),
);

router.delete(
  '/disconnect',
  asyncHandler(async (req: ProtectedRequest, res) => {
    await deactivate(req.user as any, 'youtube');
    new SuccessResponse('Youtube disconnected successfully', {
      platform: 'youtube',
    }).send(res);
  }),
);

export default router;
