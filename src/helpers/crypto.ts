import crypto from 'crypto';
const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY_BASE64 || '',
  'base64',
);

if (!ENCRYPTION_KEY) {
  throw new Error(
    'TOKEN_ENCRYPTION_KEY_BASE64 (32 bytes) is not set or must be base64',
  );
}
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
