import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
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
import { NotificationService } from '../notification.service';
import {
  NotificationPriority,
  NotificationType,
} from '../../database/model/Notification';

export interface SignupData {
  name: string;
  email: string;
  password: string;
  profilePicUrl?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: any;
  tokens: Tokens;
  role?: string;
}

class AuthService {
  private notificationService = new NotificationService();

  async signup(data: SignupData): Promise<AuthResponse> {
    const user = await UserRepo.findByEmail(data.email);
    if (user) throw new BadRequestError('User already registered');

    const accessTokenKey = crypto.randomBytes(64).toString('hex');
    const refreshTokenKey = crypto.randomBytes(64).toString('hex');
    const passwordHash = await bcrypt.hash(data.password, 10);

    const role = data.role || RoleCode.CONTENT_CREATOR;

    const { user: createdUser, keystore } = await UserRepo.create(
      {
        name: data.name,
        email: data.email,
        profilePicUrl: data.profilePicUrl,
        password: passwordHash,
      } as User,
      accessTokenKey,
      refreshTokenKey,
      role,
    );

    const tokens = await createTokens(
      createdUser,
      keystore.primaryKey,
      keystore.secondaryKey,
    );

    const userData = await getUserData(createdUser);

    // Security notification: new account created
    await this.notificationService.createNotification(
      createdUser._id,
      NotificationType.SECURITY,
      'New Account Created',
      'Your account was created successfully.',
      NotificationPriority.MEDIUM,
    );

    return {
      user: userData,
      tokens,
      role,
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const user = await UserRepo.findByEmail(data.email);
    if (!user) throw new BadRequestError('User not registered');
    if (!user.password) throw new BadRequestError('Credential not set');

    const match = await bcrypt.compare(data.password, user.password);
    if (!match) throw new AuthFailureError('Authentication failure');

    const accessTokenKey = crypto.randomBytes(64).toString('hex');
    const refreshTokenKey = crypto.randomBytes(64).toString('hex');

    await KeystoreRepo.create(user, accessTokenKey, refreshTokenKey);
    const tokens = await createTokens(
      user,
      accessTokenKey,
      refreshTokenKey,
      data.rememberMe,
    );
    const userData = await getUserData(user);

    // Security notification: successful login
    await this.notificationService.createNotification(
      user._id,
      NotificationType.SECURITY,
      'New Login',
      `You just signed in${
        data.rememberMe ? ' with remember me enabled' : ''
      }.`,
      NotificationPriority.LOW,
    );

    return {
      user: userData,
      tokens,
    };
  }

  async validateToken(token: string): Promise<{ user: User; keystore: any }> {
    const payload = await JWT.validate(token);
    validateTokenData(payload);

    const user = await UserRepo.findById(new Types.ObjectId(payload.sub));
    if (!user) throw new AuthFailureError('User not registered');

    const keystore = await KeystoreRepo.findforKey(user, payload.prm);
    if (!keystore) throw new AuthFailureError('Invalid access token');

    return { user, keystore };
  }

  async updatePassword(
    userId: Types.ObjectId,
    newPassword: string,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserRepo.updateInfo({
      _id: userId,
      password: passwordHash,
    } as User);
    await KeystoreRepo.removeAllForClient({ _id: userId } as User);

    // Security notification: password changed
    await this.notificationService.createNotification(
      userId,
      NotificationType.SECURITY,
      'Password Changed',
      'Your password was updated. If this was not you, please contact support immediately.',
      NotificationPriority.HIGH,
    );
  }
}

export default new AuthService();
