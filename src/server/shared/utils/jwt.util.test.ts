import { describe, it, expect, vi } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  signTwoFactorChallengeToken,
  verifyTwoFactorChallengeToken,
} from './jwt.util.js';

const payload = { sub: 'user-1', email: 'a@b.com', role: 'ADMIN' as const, tenantId: 'tenant-1', profileId: null };

describe('jwt.util — access tokens', () => {
  it('signs and verifies a valid access token round-trip', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.tenantId).toBe(payload.tenantId);
    expect(decoded.role).toBe(payload.role);
  });

  it('throws on a tampered token', () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -2) + (token.at(-2) === 'a' ? 'b' : 'a') + token.at(-1);
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('throws on an expired token', () => {
    vi.useFakeTimers();
    const token = signAccessToken(payload);
    vi.advanceTimersByTime(20 * 60 * 1000); // past the 15m TTL
    expect(() => verifyAccessToken(token)).toThrow();
    vi.useRealTimers();
  });
});

describe('jwt.util — two-factor challenge tokens', () => {
  it('signs and verifies a challenge token round-trip', () => {
    const token = signTwoFactorChallengeToken('user-1');
    const decoded = verifyTwoFactorChallengeToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.type).toBe('two_factor_challenge');
  });

  it('rejects a normal access token presented as a challenge token', () => {
    const accessToken = signAccessToken(payload);
    expect(() => verifyTwoFactorChallengeToken(accessToken)).toThrow();
  });
});
