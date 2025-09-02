// passport-google-link.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config/index';

// Validate configuration for Google Link strategy
const validateGoogleLinkConfig = () => {
  const { clientId, clientSecret } = config.google;
  const { baseUrl } = config.api;

  if (!clientId || !clientSecret || !baseUrl) {
    console.error('❌ Google Link Strategy: Missing configuration', {
      hasClientId: !!clientId,
      hasSecret: !!clientSecret,
      hasBaseUrl: !!baseUrl,
    });
    throw new Error('Google Link Strategy configuration is incomplete');
  }

  console.log('✅ Google Link Strategy Configuration Valid');
};

validateGoogleLinkConfig();

export const googleLinkStrategy = new GoogleStrategy(
  {
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: `${config.api.baseUrl}/api/v1/platforms/youtube/callback`,
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    // For linking, we never authenticate the app user here.
    // Just pass through tokens/profile; no req.logIn, no cookies, no app tokens.
    return done(null, { accessToken, refreshToken, profile });
  },
);

passport.use('google-link', googleLinkStrategy);
