import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireRole, requirePermission, requireStaff } from './rbac.middleware.js';
import { PERMISSIONS } from '../permissions/permissions.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';

function mockReq(user?: Partial<Request['user']>): Request {
  return { user } as Request;
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
  it('calls next() when the role resolves the permission', () => {
    const next = vi.fn();
    requirePermission(PERMISSIONS.EMPLOYEE_CREATE)(mockReq({ role: 'HR_MANAGER' } as never), {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws ForbiddenError when the role lacks the permission', () => {
    const next = vi.fn();
    expect(() =>
      requirePermission(PERMISSIONS.TENANT_LIST_ALL)(mockReq({ role: 'ADMIN' } as never), {} as Response, next),
    ).toThrow(ForbiddenError);
  });

  it('SUPER_ADMIN passes every permission check', () => {
    const next = vi.fn();
    for (const permission of Object.values(PERMISSIONS)) {
      requirePermission(permission)(mockReq({ role: 'SUPER_ADMIN' } as never), {} as Response, next);
    }
    expect(next).toHaveBeenCalledTimes(Object.values(PERMISSIONS).length);
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
