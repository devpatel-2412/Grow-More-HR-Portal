import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PERMISSIONS } from './permissions.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    role: { findFirst: vi.fn().mockResolvedValue(null) },
    userRoleAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    employeeProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    departmentPermission: { findMany: vi.fn().mockResolvedValue([]) },
    branchPermission: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('../../db/prisma.js', () => ({ prisma: prismaMock }));

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}));
vi.mock('../redis.client.js', () => ({ getRedisClient: () => redisMock }));

describe('permission-resolver.service — with a Redis client available', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.role.findFirst.mockResolvedValue(null);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.employeeProfile.findUnique.mockResolvedValue(null);
    prismaMock.departmentPermission.findMany.mockResolvedValue([]);
    prismaMock.branchPermission.findMany.mockResolvedValue([]);
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
    redisMock.del.mockResolvedValue(1);
    redisMock.keys.mockResolvedValue([]);
  });

  it('writes the resolved permission set to Redis (JSON, with a TTL) after a fresh DB resolution', async () => {
    const { resolveEffectivePermissions } = await import('./permission-resolver.service.js');
    await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');

    expect(redisMock.set).toHaveBeenCalledOnce();
    const [key, value, mode, ttlSeconds] = redisMock.set.mock.calls[0];
    expect(key).toBe('perm-cache:user-1');
    expect(JSON.parse(value)).toContain(PERMISSIONS.EMPLOYEE_READ_SELF);
    expect(mode).toBe('EX');
    expect(ttlSeconds).toBe(60);
  });

  it('reads a Redis cache hit instead of querying the database', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify([PERMISSIONS.PROJECT_MANAGE]));
    const { resolveEffectivePermissions } = await import('./permission-resolver.service.js');

    const result = await resolveEffectivePermissions('user-2', 'tenant-1', 'EMPLOYEE');

    expect(result.has(PERMISSIONS.PROJECT_MANAGE)).toBe(true);
    expect(prismaMock.userRoleAssignment.findMany).not.toHaveBeenCalled();
  });

  it('invalidateUserPermissionCache deletes that user\'s Redis key', async () => {
    const { invalidateUserPermissionCache } = await import('./permission-resolver.service.js');
    invalidateUserPermissionCache('user-3');
    await vi.waitFor(() => expect(redisMock.del).toHaveBeenCalledWith('perm-cache:user-3'));
  });

  it('invalidateAllPermissionCache deletes every perm-cache: key currently in Redis', async () => {
    redisMock.keys.mockResolvedValue(['perm-cache:user-1', 'perm-cache:user-2']);
    const { invalidateAllPermissionCache } = await import('./permission-resolver.service.js');

    invalidateAllPermissionCache();

    await vi.waitFor(() => expect(redisMock.del).toHaveBeenCalledWith('perm-cache:user-1', 'perm-cache:user-2'));
  });

  it('falls through to the database, without throwing, when the Redis read fails', async () => {
    redisMock.get.mockRejectedValue(new Error('redis unavailable'));
    const { resolveEffectivePermissions } = await import('./permission-resolver.service.js');

    const result = await resolveEffectivePermissions('user-4', 'tenant-1', 'EMPLOYEE');

    expect(result.has(PERMISSIONS.EMPLOYEE_READ_SELF)).toBe(true);
    expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalledOnce();
  });

  it('still returns the freshly-resolved result, without throwing, when the Redis write fails', async () => {
    redisMock.set.mockRejectedValue(new Error('redis unavailable'));
    const { resolveEffectivePermissions } = await import('./permission-resolver.service.js');

    const result = await resolveEffectivePermissions('user-5', 'tenant-1', 'EMPLOYEE');

    expect(result.has(PERMISSIONS.EMPLOYEE_READ_SELF)).toBe(true);
  });
});
