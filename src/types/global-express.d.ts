export {};

declare global {
  namespace Express {
    interface User {
      _id?: any;
      name?: string;
      email?: string;
      role?: string;
      accessToken?: string;
      refreshToken?: string;
      profile?: { id?: string; displayName?: string };
    }
    interface Request {
      appUser?: { id: string; email?: string; name?: string };
    }
  }
}
