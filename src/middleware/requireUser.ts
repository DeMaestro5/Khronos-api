import JWT from '../core/JWT';
import { getAccessToken, validateTokenData } from '../auth/authUtils';

type Handler = (req: any, res: any, next: any) => void;

export const requireUser: Handler = (req, res, next) => {
  try {
    const token = getAccessToken(req.headers.authorization);
    (async () => {
      const payload = await JWT.validate(token);
      validateTokenData(payload);
      req.appUser = { id: payload.sub };
      next();
    })().catch(() => res.status(401).json({ message: 'Unauthorized' }));
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
