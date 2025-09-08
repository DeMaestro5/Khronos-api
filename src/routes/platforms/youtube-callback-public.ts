import express from 'express';
import passport from 'passport';
import asyncHandler from '../../helpers/asyncHandler';
import { upsertConnection } from '../../database/repository/PlatformConnectionRepo';
import { readState } from '../../auth/state';
import { Types } from 'mongoose';
import { config } from '../../config/index';
import '../../auth/passport-google-link';

const router = express.Router();

// This route must remain PUBLIC. We rely on the signed `state` token to map back to the user.
router.get(
  '/callback',
  passport.authenticate('google-link', {
    session: false,
    failureRedirect: `${config.frontend.url}/integrations?platform=youtube&success=0`,
  }),
  asyncHandler(async (req: express.Request, res) => {
    const { state } = req.query as { state: string };
    let appUserId: string;
    try {
      appUserId = readState(state).uid;
    } catch {
      return res.redirect(
        `${config.frontend.url}/integrations?platform=youtube&success=0&reason=bad_state`,
      );
    }

    const accessToken = (req as any).user?.accessToken || '';
    const refreshToken = (req as any).user?.refreshToken;
    const channelId = (req as any).user?.profile?.id;
    const channelTitle = (req as any).user?.profile?.displayName;

    // Guard: if Google did not return an access token, surface a clear reason and do not save
    if (!accessToken) {
      return res.redirect(
        `${config.frontend.url}/integrations?platform=youtube&success=0&reason=no_token_from_google`,
      );
    }

    await upsertConnection(new Types.ObjectId(appUserId), 'youtube', {
      accessToken,
      refreshToken,
      accountId: channelId,
      accountName: channelTitle,
      permissions: ['read', 'insights', 'publish'],
    });

    return res.redirect(
      `${config.frontend.url}/integrations?platform=youtube&success=1`,
    );
  }),
);

export default router;
