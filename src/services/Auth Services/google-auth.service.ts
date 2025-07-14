import { Types } from 'mongoose';
import crypto from 'crypto';
import { BadRequestError, AuthFailureError } from '../../core/ApiError';
import UserRepo from '../../database/repository/UserRepo';
import KeystoreRepo from '../../database/repository/KeystoreRepo';
import { createTokens, validateTokenData } from '../../auth/authUtils';
import { getUserData } from '../../routes/access/utils';
import { RoleCode } from '../../database/model/Role';
import User from '../../database/model/User';
import { Tokens } from '../../types/app-request';
import JWT from '../../core/JWT';

export interface GoogleUserProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

export interface GoogleAuthResponse {
  user: any;
  tokens: Tokens;
  isNewUser: boolean;
}

class GoogleAuthService {
  async authenticateGoogleUser(
    profile: GoogleUserProfile,
  ): Promise<GoogleAuthResponse> {
    const googleId = profile.id;
    const email = profile.emails[0]?.value;
    const name = profile.displayName;
    const profilePicUrl = profile.photos[0]?.value;

    if (!email) {
      throw new BadRequestError('Email is required from Google profile');
    }

    // Check if user exists with Google ID
    let user = await UserRepo.findByGoogleId(googleId);

    if (!user) {
      // Check if user exists with email
      user = await UserRepo.findByEmail(email);

      if (user) {
        // User exists but doesn't have Google ID - link the accounts
        user = await UserRepo.linkGoogleAccount(user._id, {
          googleId,
          googleEmail: email,
          authProvider: 'google',
        });
      } else {
        // Create new user with Google account
        const accessTokenKey = crypto.randomBytes(64).toString('hex');
        const refreshTokenKey = crypto.randomBytes(64).toString('hex');

        const { user: createdUser, keystore } = await UserRepo.createWithGoogle(
          {
            name,
            email,
            profilePicUrl,
            googleId,
            googleEmail: email,
            authProvider: 'google',
            verified: true, // Google accounts are pre-verified
          } as User,
          accessTokenKey,
          refreshTokenKey,
          RoleCode.CONTENT_CREATOR,
        );

        const tokens = await createTokens(
          createdUser,
          keystore.primaryKey,
          keystore.secondaryKey,
        );

        const userData = await getUserData(createdUser);

        return {
          user: userData,
          tokens,
          isNewUser: true,
        };
      }
    }

    // User exists - generate new tokens
    const accessTokenKey = crypto.randomBytes(64).toString('hex');
    const refreshTokenKey = crypto.randomBytes(64).toString('hex');

    await KeystoreRepo.create(user, accessTokenKey, refreshTokenKey);
    const tokens = await createTokens(user, accessTokenKey, refreshTokenKey);

    const userData = await getUserData(user);

    return {
      user: userData,
      tokens,
      isNewUser: false,
    };
  }

  async validateGoogleToken(
    token: string,
  ): Promise<{ user: User; keystore: any }> {
    const payload = await JWT.validate(token);
    validateTokenData(payload);

    const user = await UserRepo.findById(new Types.ObjectId(payload.sub));
    if (!user) throw new AuthFailureError('User not registered');

    const keystore = await KeystoreRepo.findforKey(user, payload.prm);
    if (!keystore) throw new AuthFailureError('Invalid access token');

    return { user, keystore };
  }
}

export default new GoogleAuthService();
