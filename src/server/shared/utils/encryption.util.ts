import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = Buffer.from(env.TWO_FA_ENCRYPTION_KEY, 'base64');
  if (key.length !== 32) {
    throw new Error('TWO_FA_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded)');
  }
  return key;
}

/** AES-256-GCM encrypt, returning `iv:authTag:ciphertext` as a single base64-segmented string for compact storage in one column. */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted payload');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plainText = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return plainText.toString('utf8');
}
