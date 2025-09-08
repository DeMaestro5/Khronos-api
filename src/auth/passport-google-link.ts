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

// Derive effective callback URL. For localhost, force HTTP to avoid SSL errors.
const rawApiBaseUrl = config.api.baseUrl;
const effectiveApiBaseUrl = rawApiBaseUrl.startsWith('https://localhost')
  ? rawApiBaseUrl.replace('https://', 'http://')
  : rawApiBaseUrl;
const effectiveCallbackUrl = `${effectiveApiBaseUrl}/api/v1/platforms/youtube/callback`;

console.log('Google Link Raw API_URL:', rawApiBaseUrl);
console.log('Google Link Callback URL:', effectiveCallbackUrl);

export const googleLinkStrategy = new GoogleStrategy(
  {
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: effectiveCallbackUrl,
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    // For linking, we never authenticate the app user here.
    // Just pass through tokens/profile; no req.logIn, no cookies, no app tokens.
    return done(null, { accessToken, refreshToken, profile });
  },
);

passport.use('google-link', googleLinkStrategy);
