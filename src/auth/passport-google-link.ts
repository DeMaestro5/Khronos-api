// passport-google-link.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export const googleLinkStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${process.env.API_URL}/api/v1/platforms/youtube/callback`,
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    // For linking, we never authenticate the app user here.
    // Just pass through tokens/profile; no req.logIn, no cookies, no app tokens.
    return done(null, { accessToken, refreshToken, profile });
  },
);

passport.use('google-link', googleLinkStrategy);
