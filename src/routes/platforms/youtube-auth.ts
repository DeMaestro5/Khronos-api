import express from 'express';
import passport from 'passport';
import asyncHandler from '../../helpers/asyncHandler';

import {
  upsertConnection,
  deactivate,
} from '../../database/repository/PlatformConnectionRepo';
import { SuccessResponse } from '../../core/ApiResponse';
import { requireUser } from '../../middleware/requireUser';
import { makeState, readState } from '../../auth/state';
import { Types } from 'mongoose';

const router = express.Router();

router.get(
  '/connect',
  requireUser,
  asyncHandler(async (req: express.Request, res, next) => {
    const state = makeState(req.appUser!.id);
    passport.authenticate('google', {
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
      accessType: 'offline',
      prompt: 'consent',
      session: false,
      state,
    })(req, res, next);
  }),
);

router.get(
  '/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/integrations?platform=youtube&success=0`,
  }),
  asyncHandler(async (req: express.Request, res) => {
    const { state } = req.query as { state: string };
    let appUserId: string;
    try {
      appUserId = readState(state).uid;
    } catch {
      return res.redirect(
        `${process.env.FRONTEND_URL}/integrations?platform=youtube&success=0&reason=bad_state`,
      );
    }

    const accessToken = req.user?.accessToken || '';
    const refreshToken = req.user?.refreshToken;
    const channelId = req.user?.profile?.id;
    const channelTitle = req.user?.profile?.displayName;

    await upsertConnection(new Types.ObjectId(appUserId), 'youtube', {
      accessToken,
      refreshToken,
      accountId: channelId,
      accountName: channelTitle,
      permissions: ['read', 'insights'],
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/integrations?platform=youtube&success=1`,
    );
  }),
);

router.delete(
  '/disconnect',
  requireUser,
  asyncHandler(async (req: express.Request, res) => {
    await deactivate(new Types.ObjectId(req.appUser!.id), 'youtube');
    new SuccessResponse('Youtube disconnected successfully', {
      platform: 'youtube',
    }).send(res);
  }),
);

export default router;
