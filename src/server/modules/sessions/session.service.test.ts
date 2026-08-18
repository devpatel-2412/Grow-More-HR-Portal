import { describe, it, expect, vi } from 'vitest';
import { SessionService } from './session.service.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';

vi.mock('../audit/audit.service.js', () => ({
  auditLogService: { record: vi.fn().mockResolvedValue(undefined) },
}));

function makeMockRepos() {
  const refreshTokenRepository = {
    findActiveByTenant: vi.fn().mockResolvedValue([]),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  };
  const userRepository = { findById: vi.fn() };
  const tenantRepository = { findById: vi.fn().mockResolvedValue({ forceLogoutAllAt: null }), update: vi.fn() };
  return { refreshTokenRepository, userRepository, tenantRepository };
}

describe('SessionService.listActiveSessions', () => {
  it('maps active refresh tokens to dashboard rows with parsed browser/device', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    refreshTokenRepository.findActiveByTenant.mockResolvedValue([
      {
        id: 'rt-1',
        createdAt: new Date('2026-08-01T10:00:00Z'),
        lastUsedAt: new Date('2026-08-05T10:00:00Z'),
        ipAddress: '203.0.113.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
        rememberMe: true,
        user: { id: 'user-1', email: 'ada@acme.com', role: 'ADMIN', profile: { firstName: 'Ada', lastName: 'Admin' } },
      },
    ]);
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    const rows = await service.listActiveSessions('tenant-1');

    expect(rows).toEqual([
      {
        id: 'rt-1',
        userId: 'user-1',
        userName: 'Ada Admin',
        userEmail: 'ada@acme.com',
        avatarUrl: null,
        role: 'ADMIN',
        loginTime: new Date('2026-08-01T10:00:00Z'),
        lastActivity: new Date('2026-08-05T10:00:00Z'),
        browser: 'Chrome',
        device: 'Windows PC',
        ipAddress: '203.0.113.10',
        rememberMe: true,
      },
    ]);
  });

  it('falls back to email when the user has no profile', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    refreshTokenRepository.findActiveByTenant.mockResolvedValue([
      {
        id: 'rt-1',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        rememberMe: false,
        user: { id: 'user-1', email: 'ada@acme.com', role: 'EMPLOYEE', profile: null },
      },
    ]);
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    const rows = await service.listActiveSessions('tenant-1');

    expect(rows[0].userName).toBe('ada@acme.com');
    expect(rows[0].browser).toBe('Unknown');
    expect(rows[0].device).toBe('Unknown');
  });

  it('filters out sessions created before a tenant-wide force-logout-all, without a bulk write', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    const forceLogoutAt = new Date('2026-08-05T00:00:00Z');
    tenantRepository.findById.mockResolvedValue({ forceLogoutAllAt: forceLogoutAt });
    refreshTokenRepository.findActiveByTenant.mockResolvedValue([
      {
        id: 'rt-before',
        createdAt: new Date('2026-08-04T00:00:00Z'),
        lastUsedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        rememberMe: false,
        user: { id: 'user-1', email: 'before@acme.com', role: 'EMPLOYEE', profile: null },
      },
      {
        id: 'rt-after',
        createdAt: new Date('2026-08-06T00:00:00Z'),
        lastUsedAt: new Date(),
        ipAddress: null,
        userAgent: null,
        rememberMe: false,
        user: { id: 'user-2', email: 'after@acme.com', role: 'EMPLOYEE', profile: null },
      },
    ]);
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    const rows = await service.listActiveSessions('tenant-1');

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('rt-after');
  });
});

describe('SessionService.forceLogoutUser', () => {
  it('revokes every session for a user in the caller\'s own tenant', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    userRepository.findById.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' });
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    await service.forceLogoutUser('tenant-1', 'user-1', { actorUserId: 'admin-1' });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('user-1', 'admin_force_logout');
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SESSION_FORCE_LOGOUT', targetId: 'user-1', tenantId: 'tenant-1' }),
    );
  });

  it('refuses to force-logout a user from a different tenant', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    userRepository.findById.mockResolvedValue({ id: 'user-1', tenantId: 'other-tenant' });
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    await expect(service.forceLogoutUser('tenant-1', 'user-1', { actorUserId: 'admin-1' })).rejects.toThrow(NotFoundError);
    expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('404s on an unknown user id', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    userRepository.findById.mockResolvedValue(null);
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    await expect(service.forceLogoutUser('tenant-1', 'missing-user', { actorUserId: 'admin-1' })).rejects.toThrow(NotFoundError);
  });
});

describe('SessionService.forceLogoutAll', () => {
  it('bumps the tenant forceLogoutAllAt timestamp and records an audit entry', async () => {
    const { refreshTokenRepository, userRepository, tenantRepository } = makeMockRepos();
    const service = new SessionService(refreshTokenRepository as never, userRepository as never, tenantRepository as never);

    await service.forceLogoutAll('tenant-1', { actorUserId: 'admin-1' });

    expect(tenantRepository.update).toHaveBeenCalledWith('tenant-1', { forceLogoutAllAt: expect.any(Date) });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SESSION_FORCE_LOGOUT_ALL', targetId: 'tenant-1', tenantId: 'tenant-1' }),
    );
  });
});
