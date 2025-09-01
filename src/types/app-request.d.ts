// src/types/app-request.d.ts
import type { Request } from 'express';
import type Keystore from '../database/model/Keystore';
import type ApiKey from '../database/model/ApiKey';
import type DBUser from '../database/model/User';

export interface PublicRequest extends Request {
  apiKey: ApiKey;
}

export interface RoleRequest extends PublicRequest {
  currentRoleCodes: string[];
}

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
}

export type ProtectedRequest = Omit<RoleRequest, 'user'> & {
  user: DBUser;
  accessToken: string;
  keystore: Keystore;
  appUser: AppUser;
};

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  isRememberMe?: boolean;
}
