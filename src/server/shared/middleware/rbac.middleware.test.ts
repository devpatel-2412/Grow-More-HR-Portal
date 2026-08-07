import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { requireRole, requirePermission, requireAnyPermission, requireStaff } from './rbac.middleware.js';
import { invalidateAllPermissionCache } from '../permissions/permission-resolver.service.js';
import { PERMISSIONS } from '../permissions/permissions.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    userRoleAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    employeeProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    departmentPermission: { findMany: vi.fn().mockResolvedValue([]) },
    branchPermission: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));
vi.mock('../../db/prisma.js', () => ({ prisma: prismaMock }));

// The resolver caches per-userId across calls — every test below reuses the same 'user-1' id, so
// the cache must be cleared between tests or a later test could silently read an earlier test's
// (different-role) cached result instead of resolving fresh.
beforeEach(() => {
  invalidateAllPermissionCache();
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.employeeProfile.findUnique.mockResolvedValue(null);
  prismaMock.departmentPermission.findMany.mockResolvedValue([]);
  prismaMock.branchPermission.findMany.mockResolvedValue([]);
});

function mockReq(user?: Partial<Request['user']>): Request {
  return { user } as Request;
}

/** requirePermission/requireAnyPermission are asyncHandler-wrapped: the returned middleware fires
 * the async work but doesn't return its promise, so awaiting the call itself doesn't wait for
 * completion — wait for `next` to actually be invoked instead, then assert on what it received. */
async function runPermissionCheck(middleware: ReturnType<typeof requirePermission>, req: Request) {
  let resolveDone: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const next = vi.fn(() => resolveDone());
  middleware(req, {} as Response, next);
  await done;
  return next;
}

describe('requireRole', () => {
  it('calls next() when the user has one of the allowed roles', () => {
    const next = vi.fn();
    requireRole('ADMIN', 'SUPER_ADMIN')(mockReq({ role: 'ADMIN' } as never), {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws ForbiddenError when the user role is not allowed', () => {
    const next = vi.fn();
    expect(() => requireRole('SUPER_ADMIN')(mockReq({ role: 'EMPLOYEE' } as never), {} as Response, next)).toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError when there is no authenticated user', () => {
    const next = vi.fn();
    expect(() => requireRole('ADMIN')(mockReq(undefined), {} as Response, next)).toThrow(UnauthorizedError);
  });
});

describe('requirePermission', () => {
  it('calls next() when the role resolves the permission', async () => {
    const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'HR_MANAGER' } as never);
    const next = await runPermissionCheck(requirePermission(PERMISSIONS.EMPLOYEE_CREATE), req);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('throws ForbiddenError when the role lacks the permission', async () => {
    const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'ADMIN' } as never);
    const next = await runPermissionCheck(requirePermission(PERMISSIONS.TENANT_LIST_ALL), req);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('SUPER_ADMIN passes every permission check without touching the database', async () => {
    for (const permission of Object.values(PERMISSIONS)) {
      const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'SUPER_ADMIN' } as never);
      const next = await runPermissionCheck(requirePermission(permission), req);
      expect(next).toHaveBeenCalledWith();
    }
  });

  it('throws UnauthorizedError when there is no authenticated user', async () => {
    const next = await runPermissionCheck(requirePermission(PERMISSIONS.EMPLOYEE_CREATE), mockReq(undefined));
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('grants a permission the static role lacks when a dynamic Role assignment provides it', async () => {
    // EMPLOYEE has no TENANT_LIST_ALL in ROLE_PERMISSIONS — this proves the dynamic layer is
    // genuinely additive, not just falling through to the (unchanged) static result.
    prismaMock.userRoleAssignment.findMany.mockResolvedValueOnce([
      { role: { permissions: [{ permission: PERMISSIONS.TENANT_LIST_ALL }] } },
    ]);
    const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'EMPLOYEE' } as never);
    const next = await runPermissionCheck(requirePermission(PERMISSIONS.TENANT_LIST_ALL), req);
    expect(next).toHaveBeenCalledWith();
  });

  it('falls back to static-only permissions when the dynamic lookup errors, instead of failing the request', async () => {
    prismaMock.userRoleAssignment.findMany.mockRejectedValueOnce(new Error('connection lost'));
    const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'HR_MANAGER' } as never);
    const next = await runPermissionCheck(requirePermission(PERMISSIONS.EMPLOYEE_CREATE), req);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireAnyPermission', () => {
  it('calls next() when the role resolves at least one of the listed permissions', async () => {
    const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'PROJECT_MANAGER' } as never);
    const next = await runPermissionCheck(requireAnyPermission(PERMISSIONS.TENANT_LIST_ALL, PERMISSIONS.PROJECT_MANAGE), req);
    expect(next).toHaveBeenCalledWith();
  });

  it('throws ForbiddenError when none of the listed permissions resolve', async () => {
    const req = mockReq({ sub: 'user-1', tenantId: 'tenant-1', role: 'EMPLOYEE' } as never);
    const next = await runPermissionCheck(requireAnyPermission(PERMISSIONS.TENANT_LIST_ALL, PERMISSIONS.PROJECT_MANAGE), req);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

describe('requireStaff', () => {
  it('throws UnauthorizedError when there is no authenticated user', () => {
    const next = vi.fn();
    expect(() => requireStaff(mockReq(undefined), {} as Response, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError for an external-role login (CLIENT or CANDIDATE)', () => {
    for (const role of ['CLIENT', 'CANDIDATE']) {
      const next = vi.fn();
      expect(() => requireStaff(mockReq({ role } as never), {} as Response, next)).toThrow(ForbiddenError);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('calls next() for every staff role', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE', 'RECRUITER', 'FINANCE']) {
      const next = vi.fn();
      requireStaff(mockReq({ role } as never), {} as Response, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });
});
