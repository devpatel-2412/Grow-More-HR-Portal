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

// Pinned explicitly on every verify call — jsonwebtoken's own defaults are safe today (it never
// accepts `alg: none`, and a string secret can't satisfy an asymmetric algorithm), but pinning
// means a verify call can only ever succeed against the one algorithm actually used to sign,
// independent of the library's own defaults ever changing underneath this code.
const JWT_ALGORITHM = 'HS256' as const;

// Optional, separate secret for the 2FA challenge token (see env.ts) — falls back to the
// access-token secret when unset, so this is purely additive; no deployment breaks by not having
// configured it yet.
const TWO_FA_CHALLENGE_SECRET = env.JWT_TWO_FA_SECRET || env.JWT_ACCESS_SECRET;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
    algorithm: JWT_ALGORITHM,
  });
}

/**
 * Verifies against the current secret first; if that fails and a previous secret is configured
 * (JWT_ACCESS_SECRET_PREVIOUS — set only during a deliberate secret-rotation window, see env.ts),
 * retries against it. Lets JWT_ACCESS_SECRET be rotated without instantly invalidating every
 * already-issued, still-unexpired access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [JWT_ALGORITHM] }) as AccessTokenPayload;
  } catch (err) {
    if (env.JWT_ACCESS_SECRET_PREVIOUS) {
      return jwt.verify(token, env.JWT_ACCESS_SECRET_PREVIOUS, { algorithms: [JWT_ALGORITHM] }) as AccessTokenPayload;
    }
    throw err;
  }
}

/** Short-lived token identifying a user who passed step 1 (password) but still owes a TOTP code. Not a session credential. */
export function signTwoFactorChallengeToken(userId: string, rememberMe: boolean): string {
  const payload: TwoFactorChallengePayload = { sub: userId, type: 'two_factor_challenge', rememberMe };
  return jwt.sign(payload, TWO_FA_CHALLENGE_SECRET, { expiresIn: '5m', algorithm: JWT_ALGORITHM });
}

export function verifyTwoFactorChallengeToken(token: string): TwoFactorChallengePayload {
  const decoded = jwt.verify(token, TWO_FA_CHALLENGE_SECRET, { algorithms: [JWT_ALGORITHM] }) as TwoFactorChallengePayload;
  if (decoded.type !== 'two_factor_challenge') {
    throw new Error('Invalid challenge token type');
  }
  return decoded;
}
