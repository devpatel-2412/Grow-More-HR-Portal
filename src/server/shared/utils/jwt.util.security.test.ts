import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const envMock = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_ACCESS_SECRET_PREVIOUS: '',
  JWT_ACCESS_TTL: '15m',
  JWT_TWO_FA_SECRET: '',
};

vi.mock('../config/env.js', () => ({ env: envMock }));

const payload = { sub: 'user-1', email: 'a@b.com', role: 'ADMIN' as const, tenantId: 'tenant-1', profileId: null };

describe('jwt.util — algorithm pinning', () => {
  beforeEach(() => {
    envMock.JWT_ACCESS_SECRET_PREVIOUS = '';
  });

  it('rejects a forged token using alg:none, even with a matching payload and no signature', async () => {
    const { verifyAccessToken } = await import('./jwt.util.js');
    const forgedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const forgedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const forgedToken = `${forgedHeader}.${forgedPayload}.`;

    expect(() => verifyAccessToken(forgedToken)).toThrow();
  });

  it('rejects a token re-signed with a different (but still HMAC) algorithm the app never uses', async () => {
    const { verifyAccessToken } = await import('./jwt.util.js');
    // Deliberately signed with HS512 against the *same* secret this app actually uses — proves
    // the pinned `algorithms: ['HS256']` check on the verify side is what's rejecting it, not
    // just an unrelated signature mismatch.
    const wrongAlgToken = jwt.sign(payload, envMock.JWT_ACCESS_SECRET, { algorithm: 'HS512', expiresIn: '15m' });

    expect(() => verifyAccessToken(wrongAlgToken)).toThrow();
  });
});

describe('jwt.util — access-token secret rotation fallback', () => {
  beforeEach(() => {
    envMock.JWT_ACCESS_SECRET_PREVIOUS = '';
  });

  it('verifies a token signed with the previous secret when JWT_ACCESS_SECRET_PREVIOUS is configured', async () => {
    const { verifyAccessToken } = await import('./jwt.util.js');
    const oldSecret = 'b'.repeat(32);
    const tokenFromBeforeRotation = jwt.sign(payload, oldSecret, { algorithm: 'HS256', expiresIn: '15m' });

    envMock.JWT_ACCESS_SECRET_PREVIOUS = oldSecret;

    const decoded = verifyAccessToken(tokenFromBeforeRotation);
    expect(decoded.sub).toBe(payload.sub);
  });

  it('still rejects a token signed with neither the current nor the previous secret', async () => {
    const { verifyAccessToken } = await import('./jwt.util.js');
    envMock.JWT_ACCESS_SECRET_PREVIOUS = 'b'.repeat(32);
    const tokenFromSomeOtherSecret = jwt.sign(payload, 'c'.repeat(32), { algorithm: 'HS256', expiresIn: '15m' });

    expect(() => verifyAccessToken(tokenFromSomeOtherSecret)).toThrow();
  });

  it('rejects every token once no previous secret is configured (the default, pre-rotation state)', async () => {
    const { verifyAccessToken } = await import('./jwt.util.js');
    const oldSecret = 'b'.repeat(32);
    const tokenFromBeforeRotation = jwt.sign(payload, oldSecret, { algorithm: 'HS256', expiresIn: '15m' });

    expect(envMock.JWT_ACCESS_SECRET_PREVIOUS).toBe('');
    expect(() => verifyAccessToken(tokenFromBeforeRotation)).toThrow();
  });
});

describe('jwt.util — 2FA challenge token uses a separate secret when configured', () => {
  it('does not verify against the plain access-token secret once JWT_TWO_FA_SECRET is set', async () => {
    vi.resetModules();
    envMock.JWT_TWO_FA_SECRET = 'd'.repeat(32);
    const { signTwoFactorChallengeToken } = await import('./jwt.util.js');

    const challengeToken = signTwoFactorChallengeToken('user-1', false);

    // The real access-token secret must NOT be able to verify a challenge token once a distinct
    // 2FA secret is configured — proves the two token kinds are cryptographically separated, not
    // just logically distinguished by the `type` field.
    expect(() => jwt.verify(challengeToken, envMock.JWT_ACCESS_SECRET, { algorithms: ['HS256'] })).toThrow();
    // ...but it does verify against the configured 2FA secret itself.
    const decoded = jwt.verify(challengeToken, envMock.JWT_TWO_FA_SECRET, { algorithms: ['HS256'] }) as { sub: string };
    expect(decoded.sub).toBe('user-1');

    envMock.JWT_TWO_FA_SECRET = '';
    vi.resetModules();
  });
});
