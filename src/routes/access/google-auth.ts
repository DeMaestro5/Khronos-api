import express from 'express';
import passport from 'passport';
import { SuccessResponse } from '../../core/ApiResponse';
import { PublicRequest } from '../../types/app-request';
import asyncHandler from '../../helpers/asyncHandler';
import GoogleAuthService from '../../services/Auth Services/google-auth.service';

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
    const profile = req.user as any;

    if (!profile) {
      return res.status(400).json({
        statusCode: '10001',
        message: 'Google authentication failed',
      });
    }

    const { user, tokens, isNewUser } =
      await GoogleAuthService.authenticateGoogleUser(profile);

    const message = isNewUser
      ? 'Google signup successful'
      : 'Google login successful';

    new SuccessResponse(message, {
      user,
      tokens,
      isNewUser,
    }).send(res);
  }),
);

// Google OAuth failure route
router.get('/failure', (req, res) => {
  res.status(400).json({
    statusCode: '10001',
    message: 'Google authentication failed',
  });
});

export default router;
