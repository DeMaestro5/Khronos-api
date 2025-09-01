declare global {
  namespace Express {
    interface User {
      accessToken?: string;
      refreshToken?: string;
      profile?: { id?: string; displayName?: string };
    }
  }
}
export {};
