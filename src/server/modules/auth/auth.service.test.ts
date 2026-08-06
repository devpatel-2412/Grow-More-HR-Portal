import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { hashPassword } from '../../shared/utils/hash.util.js';
import { UnauthorizedError, ForbiddenError, ConflictError } from '../../shared/errors/app-error.js';
import { signTwoFactorChallengeToken } from '../../shared/utils/jwt.util.js';
import { twoFactorService } from '../two-factor/two-factor.service.js';
import { auditLogService } from '../audit/audit.service.js';

vi.mock('../audit/audit.service.js', () => ({
  auditLogService: {
    record: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ rows: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  },
}));
vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}));

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'admin@acme.com',
    passwordHash: hashPassword('CorrectPassword123'),
    role: 'ADMIN' as const,
    status: 'ACTIVE' as const,
    tenantId: 'tenant-1',
    is2FAEnabled: false,
    twoFactorSecret: null,
    twoFactorRecoveryCodesHash: [] as string[],
    lockedUntil: null,
    failedLoginCount: 0,
    ...overrides,
  };
}

function makeMockRepos(user = makeUser()) {
  const userRepository = {
    findByEmail: vi.fn().mockResolvedValue(user),
    findById: vi.fn().mockResolvedValue(user),
    findByIdWithProfile: vi.fn().mockResolvedValue({ ...user, profile: null, tenant: null }),
    recordLoginSuccess: vi.fn().mockResolvedValue(user),
    recordLoginFailure: vi.fn().mockResolvedValue(user),
    update: vi.fn().mockResolvedValue(user),
  };
  const tenantRepository = { findByDomain: vi.fn(), findById: vi.fn() };
  const refreshTokenRepository = {
    create: vi.fn().mockResolvedValue({ id: 'rt-1', familyId: 'family-1' }),
    findByTokenHash: vi.fn(),
    revoke: vi.fn().mockResolvedValue(undefined),
    revokeFamily: vi.fn().mockResolvedValue(undefined),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  };
  return { userRepository, tenantRepository, refreshTokenRepository, user };
}

describe('AuthService.login', () => {
  it('issues an access + refresh token pair for correct credentials without 2FA', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: false }, {});

    expect(result.requiresTwoFactor).toBe(false);
    if (!result.requiresTwoFactor) {
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    }
    expect(userRepository.recordLoginSuccess).toHaveBeenCalledWith('user-1');
    expect(refreshTokenRepository.create).toHaveBeenCalledOnce();
  });

  it('returns a two-factor challenge instead of tokens when 2FA is enabled', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(
      makeUser({ is2FAEnabled: true, twoFactorSecret: 'encrypted-secret' }),
    );
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: false }, {});

    expect(result.requiresTwoFactor).toBe(true);
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown email with a generic error (no user enumeration)', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    userRepository.findByEmail.mockResolvedValue(null);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.login({ email: 'nobody@acme.com', password: 'x', rememberMe: false }, {})).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('rejects an incorrect password and records the failed attempt', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.login({ email: 'admin@acme.com', password: 'WrongPassword', rememberMe: false }, {})).rejects.toThrow(
      UnauthorizedError,
    );
    expect(userRepository.recordLoginFailure).toHaveBeenCalledOnce();
  });

  it('rejects login for a locked account without even checking the password', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(
      makeUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: false }, {})).rejects.toThrow(
      UnauthorizedError,
    );
    expect(userRepository.recordLoginFailure).not.toHaveBeenCalled();
  });

  it('rejects login for a non-ACTIVE account (e.g. PENDING_INVITE)', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(makeUser({ status: 'PENDING_INVITE' }));
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: false }, {})).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('creates the token with rememberMe: false when unchecked', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: false }, {});

    expect(refreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({ rememberMe: false }));
  });

  it('honors rememberMe: true and uses the tenant-configured rememberMeDurationDays for the expiry', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    tenantRepository.findById.mockResolvedValue({ rememberMeDurationDays: 45 });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: true }, {});

    expect(result.requiresTwoFactor).toBe(false);
    if (result.requiresTwoFactor) throw new Error('expected tokens, not a 2FA challenge');
    expect(result.rememberMe).toBe(true);
    const expectedExpiry = Date.now() + 45 * 24 * 60 * 60 * 1000;
    expect(result.refreshTokenExpiresAt.getTime()).toBeGreaterThan(expectedExpiry - 5000);
    expect(result.refreshTokenExpiresAt.getTime()).toBeLessThan(expectedExpiry + 5000);
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({ rememberMe: true }));
  });
});

describe('AuthService.verifyTwoFactorChallenge', () => {
  it('completes login when the TOTP code is valid', async () => {
    const user = makeUser({ is2FAEnabled: true, twoFactorSecret: 'encrypted-secret' });
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(user);
    vi.spyOn(twoFactorService, 'verifyCode').mockReturnValue(true);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);
    const challengeToken = signTwoFactorChallengeToken(user.id, false);

    const result = await service.verifyTwoFactorChallenge({ challengeToken, code: '123456' }, {});

    expect(result.accessToken).toBeTruthy();
    expect(refreshTokenRepository.create).toHaveBeenCalledOnce();
  });

  it('rejects an invalid TOTP code', async () => {
    const user = makeUser({ is2FAEnabled: true, twoFactorSecret: 'encrypted-secret' });
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(user);
    vi.spyOn(twoFactorService, 'verifyCode').mockReturnValue(false);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);
    const challengeToken = signTwoFactorChallengeToken(user.id, false);

    await expect(service.verifyTwoFactorChallenge({ challengeToken, code: '000000' }, {})).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a garbage/expired challenge token', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.verifyTwoFactorChallenge({ challengeToken: 'not-a-real-token', code: '123456' }, {})).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('carries the rememberMe choice from the initial login through to the completed session', async () => {
    const user = makeUser({ is2FAEnabled: true, twoFactorSecret: 'encrypted-secret' });
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(user);
    vi.spyOn(twoFactorService, 'verifyCode').mockReturnValue(true);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const loginResult = await service.login({ email: 'admin@acme.com', password: 'CorrectPassword123', rememberMe: true }, {});
    expect(loginResult.requiresTwoFactor).toBe(true);
    if (!loginResult.requiresTwoFactor) throw new Error('expected a 2FA challenge');

    const verifyResult = await service.verifyTwoFactorChallenge(
      { challengeToken: loginResult.challengeToken, code: '123456' },
      {},
    );

    expect(verifyResult.rememberMe).toBe(true);
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({ rememberMe: true }));
  });
});

describe('AuthService.refresh — rotation and reuse detection', () => {
  it('rotates the token: revokes the old one and issues a new one in the same family', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    const rawToken = 'raw-refresh-token';
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-old',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      deviceInfo: null,
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.refresh(rawToken, {});

    expect(result.accessToken).toBeTruthy();
    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-old', 'rotated', 'rt-1');
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({ familyId: 'family-1' }));
  });

  it('detects reuse of an already-revoked token and revokes the whole family', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-stolen',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: new Date(), // already rotated once — presenting it again means theft
      expiresAt: new Date(Date.now() + 60_000),
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.refresh('stolen-token', {})).rejects.toThrow(UnauthorizedError);
    expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family-1', 'reuse_detected');
  });

  it('rejects an unknown refresh token', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.refresh('unknown-token', {})).rejects.toThrow(UnauthorizedError);
  });

  it('rejects an expired refresh token', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-old',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.refresh('expired-token', {})).rejects.toThrow(UnauthorizedError);
  });

  it('carries rememberMe forward unchanged across rotation', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-remember',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
      createdAt: new Date(),
      deviceInfo: null,
      rememberMe: true,
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.refresh('remember-me-token', {});

    expect(result.rememberMe).toBe(true);
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(expect.objectContaining({ rememberMe: true }));
  });
});

describe('AuthService.refresh — inactivity timeout and force-logout-all', () => {
  it('rejects and revokes the family once idle time exceeds the tenant-configured timeout', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    tenantRepository.findById.mockResolvedValue({ sessionTimeoutMinutes: 30, forceLogoutAllAt: null });
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-idle',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(Date.now() - 31 * 60_000),
      createdAt: new Date(Date.now() - 60 * 60_000),
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.refresh('idle-token', {})).rejects.toThrow(UnauthorizedError);
    expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family-1', 'inactivity_timeout');
  });

  it('allows a refresh within the configured inactivity window', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    tenantRepository.findById.mockResolvedValue({ sessionTimeoutMinutes: 30, forceLogoutAllAt: null });
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-active',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(Date.now() - 5 * 60_000),
      createdAt: new Date(Date.now() - 60 * 60_000),
      deviceInfo: null,
      rememberMe: false,
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.refresh('active-token', {});
    expect(result.accessToken).toBeTruthy();
  });

  it('never times out when sessionTimeoutMinutes is null ("Never Expire")', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    tenantRepository.findById.mockResolvedValue({ sessionTimeoutMinutes: null, forceLogoutAllAt: null });
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-old-idle',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(Date.now() - 999 * 60_000),
      createdAt: new Date(Date.now() - 1000 * 60_000),
      deviceInfo: null,
      rememberMe: false,
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.refresh('never-expire-token', {});
    expect(result.accessToken).toBeTruthy();
  });

  it('rejects a session issued before a tenant-wide force-logout-all', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    const forceLogoutAt = new Date();
    tenantRepository.findById.mockResolvedValue({ sessionTimeoutMinutes: null, forceLogoutAllAt: forceLogoutAt });
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-pre-force-logout',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
      createdAt: new Date(forceLogoutAt.getTime() - 1000),
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.refresh('pre-force-logout-token', {})).rejects.toThrow(UnauthorizedError);
    expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family-1', 'force_logout_all');
  });

  it('allows a session issued after a tenant-wide force-logout-all', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository, user } = makeMockRepos();
    const forceLogoutAt = new Date(Date.now() - 60_000);
    tenantRepository.findById.mockResolvedValue({ sessionTimeoutMinutes: null, forceLogoutAllAt: forceLogoutAt });
    refreshTokenRepository.findByTokenHash.mockResolvedValue({
      id: 'rt-post-force-logout',
      userId: user.id,
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
      createdAt: new Date(),
      deviceInfo: null,
      rememberMe: false,
    });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.refresh('post-force-logout-token', {});
    expect(result.accessToken).toBeTruthy();
  });
});

describe('AuthService.logout / logoutAll', () => {
  it('logout revokes only the presented token', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    refreshTokenRepository.findByTokenHash.mockResolvedValue({ id: 'rt-1', userId: 'user-1', revokedAt: null });
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.logout('raw-token', {});

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1', 'logout');
  });

  it('logout is a no-op when no cookie was presented', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.logout(undefined, {});

    expect(refreshTokenRepository.findByTokenHash).not.toHaveBeenCalled();
  });

  it('logoutAll revokes every refresh token for the user', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.logoutAll('user-1', {});

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user-1', 'logout_all');
  });
});

describe('AuthService.getLoginHistory', () => {
  it("queries the audit log scoped to the caller's own login attempts, not the tenant-wide log", async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.getLoginHistory('user-1', 2, 10);

    expect(auditLogService.list).toHaveBeenCalledWith(
      { actorUserId: 'user-1', action: ['USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILURE'] },
      2,
      10,
    );
  });
});

describe('AuthService.changePassword', () => {
  it('updates the password hash and revokes all sessions on success', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.changePassword('user-1', { currentPassword: 'CorrectPassword123', newPassword: 'NewPassword456' }, {});

    expect(userRepository.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ passwordHash: expect.any(String) }));
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user-1', 'password_change');
  });

  it('rejects when the current password is wrong', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos();
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(
      service.changePassword('user-1', { currentPassword: 'WrongPassword', newPassword: 'NewPassword456' }, {}),
    ).rejects.toThrow(UnauthorizedError);
    expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
  });
});

describe('AuthService — two-factor enrollment lifecycle', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('enable() requires a prior enrollment (a stored secret)', async () => {
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(makeUser({ twoFactorSecret: null }));
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.enableTwoFactor('user-1', { code: '123456' }, {})).rejects.toThrow(ConflictError);
  });

  it('enable() turns on 2FA and returns recovery codes when the code is valid', async () => {
    const user = makeUser({ twoFactorSecret: 'encrypted-secret' });
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(user);
    vi.spyOn(twoFactorService, 'verifyCode').mockReturnValue(true);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    const result = await service.enableTwoFactor('user-1', { code: '123456' }, {});

    expect(result.recoveryCodes).toHaveLength(10);
    expect(userRepository.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ is2FAEnabled: true }));
  });

  it('disable() requires the correct password and a valid code', async () => {
    const user = makeUser({ is2FAEnabled: true, twoFactorSecret: 'encrypted-secret' });
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(user);
    vi.spyOn(twoFactorService, 'verifyCode').mockReturnValue(true);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await service.disableTwoFactor('user-1', { password: 'CorrectPassword123', code: '123456' }, {});

    expect(userRepository.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ is2FAEnabled: false }));
  });

  it('disable() rejects an incorrect password even with a valid code', async () => {
    const user = makeUser({ is2FAEnabled: true, twoFactorSecret: 'encrypted-secret' });
    const { userRepository, tenantRepository, refreshTokenRepository } = makeMockRepos(user);
    vi.spyOn(twoFactorService, 'verifyCode').mockReturnValue(true);
    const service = new AuthService(userRepository as never, tenantRepository as never, refreshTokenRepository as never);

    await expect(service.disableTwoFactor('user-1', { password: 'WrongPassword', code: '123456' }, {})).rejects.toThrow(
      UnauthorizedError,
    );
  });
});
