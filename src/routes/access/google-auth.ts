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
    // Check configuration status
    const configStatus = {
      hasClientId: !!(
        config.google.clientId &&
        config.google.clientId !== 'your-google-client-id'
      ),
      hasClientSecret: !!(
        config.google.clientSecret &&
        config.google.clientSecret !== 'your-google-client-secret'
      ),
      hasCallbackUrl: !!config.google.callbackUrl,
      hasFrontendUrl: !!config.frontend.url,
      hasApiUrl: !!config.api.baseUrl,
    };

    const isConfigured = Object.values(configStatus).every(Boolean);

    new SuccessResponse('Google OAuth configuration status', {
      status: isConfigured ? 'ready' : 'configuration_incomplete',
      configStatus,
      endpoints: {
        login: '/api/v1/auth/google/login',
        callback: '/api/v1/auth/google/callback',
        failure: '/api/v1/auth/google/failure',
      },
      urls: {
        frontend: config.frontend.url,
        api: config.api.baseUrl,
        callback: config.google.callbackUrl,
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
      const authData = req.user as any;

      // Debug logging for production
      console.log('🔍 Google OAuth Callback - Auth Data:', {
        hasAuthData: !!authData,
        hasProfile: !!authData?.profile,
        profileId: authData?.profile?.id,
        profileEmails: authData?.profile?.emails,
        accessToken: authData?.accessToken ? 'present' : 'missing',
      });

      if (!authData || !authData.profile) {
        console.log('❌ Google OAuth Failed: No auth data or profile');
        const frontendUrl = config.frontend.url;
        const redirectUrl = `${frontendUrl}/auth/google-callback?error=auth_failed&message=No profile data received`;
        return res.redirect(redirectUrl);
      }

      // Extract the actual Google profile from the auth data
      const googleProfile = authData.profile;

      // Validate required profile fields
      if (
        !googleProfile.id ||
        !googleProfile.emails ||
        !googleProfile.emails[0]?.value
      ) {
        console.log(
          '❌ Google OAuth Failed: Invalid profile structure',
          googleProfile,
        );
        const frontendUrl = config.frontend.url;
        const redirectUrl = `${frontendUrl}/auth/google-callback?error=auth_failed&message=Invalid profile data`;
        return res.redirect(redirectUrl);
      }

      console.log('✅ Google OAuth Success: Processing user authentication');
      const { user, tokens, isNewUser } =
        await GoogleAuthService.authenticateGoogleUser(googleProfile);

      // Redirect to frontend with tokens and user data
      const frontendUrl = config.frontend.url;
      const redirectUrl = `${frontendUrl}/auth/google-callback?success=true&accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&userId=${user._id}&isNewUser=${isNewUser}`;

      console.log('🎉 Google OAuth Complete: Redirecting to frontend');
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('💥 Google OAuth Error:', error);
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
