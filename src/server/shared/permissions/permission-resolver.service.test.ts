import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveEffectivePermissions, invalidateUserPermissionCache, invalidateAllPermissionCache } from './permission-resolver.service.js';
import { ALL_PERMISSIONS, PERMISSIONS } from './permissions.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    userRoleAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    employeeProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    departmentPermission: { findMany: vi.fn().mockResolvedValue([]) },
    branchPermission: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('../../db/prisma.js', () => ({ prisma: prismaMock }));

beforeEach(() => {
  invalidateAllPermissionCache();
  vi.clearAllMocks();
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.employeeProfile.findUnique.mockResolvedValue(null);
  prismaMock.departmentPermission.findMany.mockResolvedValue([]);
  prismaMock.branchPermission.findMany.mockResolvedValue([]);
});

describe('resolveEffectivePermissions', () => {
  it('SUPER_ADMIN gets every permission without any DB query', async () => {
    const result = await resolveEffectivePermissions('user-1', 'tenant-1', 'SUPER_ADMIN');
    expect(result).toEqual(new Set(ALL_PERMISSIONS));
    expect(prismaMock.userRoleAssignment.findMany).not.toHaveBeenCalled();
  });

  it('matches the static ROLE_PERMISSIONS set when there is no dynamic data', async () => {
    const result = await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    expect(result.has(PERMISSIONS.EMPLOYEE_READ_SELF)).toBe(true);
    expect(result.has(PERMISSIONS.TENANT_LIST_ALL)).toBe(false);
  });

  it('unions in permissions granted via a dynamic UserRoleAssignment', async () => {
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: { permissions: [{ permission: PERMISSIONS.TENANT_LIST_ALL }] } },
    ]);
    const result = await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    expect(result.has(PERMISSIONS.TENANT_LIST_ALL)).toBe(true);
    // Static grants are still present — the dynamic layer is additive, not a replacement.
    expect(result.has(PERMISSIONS.EMPLOYEE_READ_SELF)).toBe(true);
  });

  it('unions in department- and branch-scoped permissions for the user\'s profile', async () => {
    prismaMock.employeeProfile.findUnique.mockResolvedValue({ department: 'Engineering', branchId: 'branch-1' });
    prismaMock.departmentPermission.findMany.mockResolvedValue([{ permission: PERMISSIONS.PROJECT_MANAGE }]);
    prismaMock.branchPermission.findMany.mockResolvedValue([{ permission: PERMISSIONS.FINANCE_READ }]);

    const result = await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    expect(result.has(PERMISSIONS.PROJECT_MANAGE)).toBe(true);
    expect(result.has(PERMISSIONS.FINANCE_READ)).toBe(true);
  });

  it('caches the result — a second call within the TTL does not hit the database again', async () => {
    await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalledOnce();
  });

  it('invalidateUserPermissionCache forces the next resolution for that user to re-query', async () => {
    await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    invalidateUserPermissionCache('user-1');
    await resolveEffectivePermissions('user-1', 'tenant-1', 'EMPLOYEE');
    expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalledTimes(2);
  });

  it('falls back to the static-only result, uncached, when the dynamic lookup throws', async () => {
    prismaMock.userRoleAssignment.findMany.mockRejectedValueOnce(new Error('connection lost'));
    const result = await resolveEffectivePermissions('user-1', 'tenant-1', 'HR_MANAGER');
    expect(result.has(PERMISSIONS.EMPLOYEE_CREATE)).toBe(true);

    // The failed lookup must not be cached — the very next call should retry the DB rather than
    // being stuck on the degraded result for the rest of the TTL window.
    prismaMock.userRoleAssignment.findMany.mockResolvedValueOnce([]);
    await resolveEffectivePermissions('user-1', 'tenant-1', 'HR_MANAGER');
    expect(prismaMock.userRoleAssignment.findMany).toHaveBeenCalledTimes(2);
  });
});
