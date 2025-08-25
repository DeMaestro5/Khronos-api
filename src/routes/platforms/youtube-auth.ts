import express from 'express';
import passport from 'passport';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { Types } from 'mongoose';
import PlatformConnectionRepo from '../../database/repository/PlatformConnectionRepo';
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
  passport.authenticate('google', {
    session: false,
  }),
  asyncHandler(async (req: ProtectedRequest, res) => {
    const { accessToken, refreshToken, channelId, channelTitle, expiresIn } =
      req.query as any;
    if (!accessToken) {
      return res.redirect(
        `${
          process.env.FRONTEND_URL || 'http://localhost:3000'
        }/integrations?error=missing_tokens'}`,
      );
    }

    const userId = new Types.ObjectId(
      (req.user as any)?.id || req.query.userId,
    );
    await PlatformConnectionRepo.upsertConnection(userId, 'youtube', {
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

    new SuccessResponse('Youtube connected successfully', {
      platform: 'youtube',
      channel: { channelId, channelTitle },
      connected: true,
    }).send(res);
  }),
);

router.delete(
  '/disconnect',
  asyncHandler(async (req: ProtectedRequest, res) => {
    await PlatformConnectionRepo.deactivate(req.user as any, 'youtube');
    new SuccessResponse('Youtube disconnected successfully', {
      platform: 'youtube',
    }).send(res);
  }),
);

export default router;
