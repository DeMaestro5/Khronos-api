import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';

// Validate Google OAuth configuration
const validateGoogleConfig = () => {
  const { clientId, clientSecret, callbackUrl } = config.google;

  if (!clientId || clientId === 'your-google-client-id') {
    console.error('❌ GOOGLE_CLIENT_ID is missing or not set');
    throw new Error('Google OAuth Client ID is required');
  }

  if (!clientSecret || clientSecret === 'your-google-client-secret') {
    console.error('❌ GOOGLE_CLIENT_SECRET is missing or not set');
    throw new Error('Google OAuth Client Secret is required');
  }

  if (!callbackUrl) {
    console.error('❌ GOOGLE_CALLBACK_URL is missing');
    throw new Error('Google OAuth Callback URL is required');
  }

  console.log('✅ Google OAuth Configuration Valid:', {
    clientId: clientId.substring(0, 10) + '...',
    callbackUrl,
    hasSecret: !!clientSecret,
  });
};

// Validate configuration before creating strategy
validateGoogleConfig();

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Pass the profile to the callback route
        return done(null, {
          accessToken,
          refreshToken,
          profile,
        });
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

// Serialize user for session (not used in stateless JWT auth, but required by passport)
passport.serializeUser((user: any, done) => {
  done(null, user);
});

// Deserialize user from session (not used in stateless JWT auth, but required by passport)
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
