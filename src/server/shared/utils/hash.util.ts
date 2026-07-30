import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const BCRYPT_COST_FACTOR = 12;

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, BCRYPT_COST_FACTOR);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

/** Deterministic SHA-256 hash, used for opaque tokens (refresh tokens, invite tokens, reset tokens) so only the hash is ever persisted. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Generates a URL-safe random opaque token, returned to the client once and never stored raw. */
export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
