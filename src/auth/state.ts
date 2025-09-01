import jwt from 'jsonwebtoken';

const STATE_SECRET = process.env.OAUTH_STATE_SECRET!;

export function makeState(appUserId: string) {
  return jwt.sign({ uid: appUserId, t: Date.now() }, STATE_SECRET, {
    expiresIn: '10m',
  });
}

export function readState(state: string) {
  return jwt.verify(state, STATE_SECRET) as { uid: string; t: number };
}
