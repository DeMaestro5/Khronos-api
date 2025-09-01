import type DBUser from '../database/model/User';

declare global {
  namespace Express {
    interface User extends Partial<DBUser> {
      accessToken?: string;
      refreshToken?: string;
      profile?: { id?: string; displayName?: string };
      _id?: any;
    }
    interface Request {
      user?: User;
      appUser?: { id: string; email?: string; name?: string };
    }
  }
}
export {};
