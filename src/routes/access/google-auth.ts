import express from 'express';
import passport from 'passport';
import { SuccessResponse } from '../../core/ApiResponse';
import { PublicRequest } from '../../types/app-request';
import asyncHandler from '../../helpers/asyncHandler';
import GoogleAuthService from '../../services/Auth Services/google-auth.service';
import { config } from '../../config/index';

const router = express.Router();

// Test route to verify Google OAuth configuration
router.get(
  '/test',
  asyncHandler(async (req: PublicRequest, res) => {
    new SuccessResponse('Google OAuth is configured and ready', {
      status: 'ready',
      endpoints: {
        login: '/api/v1/auth/google/login',
        callback: '/api/v1/auth/google/callback',
        failure: '/api/v1/auth/google/failure',
      },
    }).send(res);
  }),
);

// Google OAuth login route
router.get(
  '/login',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  }),
);

// Google OAuth callback route
router.get(
  '/callback',
  passport.authenticate('google', { session: false }),
  asyncHandler(async (req: PublicRequest, res) => {
    try {
      const profile = req.user as any;

      if (!profile) {
        const frontendUrl = config.frontend.url;
        const redirectUrl = `${frontendUrl}/auth/google-callback?error=auth_failed&message=Google authentication failed`;
        return res.redirect(redirectUrl);
      }

      const { user, tokens, isNewUser } =
        await GoogleAuthService.authenticateGoogleUser(profile);

      // Redirect to frontend with tokens and user data
      const frontendUrl = config.frontend.url;
      const redirectUrl = `${frontendUrl}/auth/google-callback?success=true&accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&userId=${user._id}&isNewUser=${isNewUser}`;

      res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = config.frontend.url;
      const redirectUrl = `${frontendUrl}/auth/google-callback?error=auth_failed&message=${encodeURIComponent(
        error instanceof Error ? error.message : 'Authentication failed',
      )}`;
      res.redirect(redirectUrl);
    }
  }),
);

// Google OAuth failure route
router.get('/failure', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectUrl = `${frontendUrl}/auth/google-callback?error=auth_failed&message=Google authentication failed`;
  res.redirect(redirectUrl);
});

export default router;
