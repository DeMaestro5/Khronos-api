import crypto from 'crypto';
const keyB64 = process.env.ENCRYPTION_KEY_BASE64 || '';
const ENCRYPTION_KEY_BUF = keyB64 ? Buffer.from(keyB64, 'base64') : undefined;

if (!ENCRYPTION_KEY_BUF || ENCRYPTION_KEY_BUF.length !== 32) {
  throw new Error(
    'ENCRYPTION_KEY_BASE64 must be a base64-encoded 32-byte key (e.g. openssl rand -base64 32)',
  );
}
const ENCRYPTION_KEY: Buffer = ENCRYPTION_KEY_BUF;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString('hex'),
    encrypted.toString('hex'),
    tag.toString('hex'),
  ].join(':');
}

export function decrypt(payload: string): string {
  const [ivB64, dataB64, tagB64] = payload.split(':');
  const iv = Buffer.from(ivB64, 'hex');
  const data = Buffer.from(dataB64, 'hex');
  const tag = Buffer.from(tagB64, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export function decryptIfPresent(cipherText?: string): string | undefined {
  if (!cipherText) return undefined;
  return decrypt(cipherText);
}
