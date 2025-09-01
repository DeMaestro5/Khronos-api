import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';

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
