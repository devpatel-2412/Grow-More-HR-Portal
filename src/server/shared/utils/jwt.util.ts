import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  tenantId: string;
  profileId: string | null;
}

export interface TwoFactorChallengePayload {
  sub: string; // userId
  type: 'two_factor_challenge';
  rememberMe: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Short-lived token identifying a user who passed step 1 (password) but still owes a TOTP code. Not a session credential. */
export function signTwoFactorChallengeToken(userId: string, rememberMe: boolean): string {
  const payload: TwoFactorChallengePayload = { sub: userId, type: 'two_factor_challenge', rememberMe };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
}

export function verifyTwoFactorChallengeToken(token: string): TwoFactorChallengePayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TwoFactorChallengePayload;
  if (decoded.type !== 'two_factor_challenge') {
    throw new Error('Invalid challenge token type');
  }
  return decoded;
}
