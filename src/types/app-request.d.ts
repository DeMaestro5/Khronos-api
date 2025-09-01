import { Request } from 'express';
import Keystore from '../database/model/Keystore';
import ApiKey from '../database/model/ApiKey';

declare interface PublicRequest extends Request {
  apiKey: ApiKey;
}

declare interface RoleRequest extends PublicRequest {
  currentRoleCodes: string[];
}

declare interface AppUser {
  id: string;
  email: string;
  name: string;
}

declare interface ProtectedRequest extends RoleRequest {
  accessToken: string;
  keystore: Keystore;
  appUser: AppUser;
}

declare interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
  refreshTokenExpiresIn: number; // seconds
  isRememberMe?: boolean; // indicates if this was a remember me login
}
