import { describe, it, expect } from 'vitest';
import { roleHasPermission, PERMISSIONS, ROLE_PERMISSIONS } from './permissions.js';

describe('permissions', () => {
  it('grants SUPER_ADMIN every permission in the catalogue', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(roleHasPermission('SUPER_ADMIN', permission)).toBe(true);
    }
  });

  it('grants EMPLOYEE only self-service permissions', () => {
    // Should have self-service permissions
    expect(roleHasPermission('EMPLOYEE', PERMISSIONS.EMPLOYEE_READ_SELF)).toBe(true);
    expect(roleHasPermission('EMPLOYEE', PERMISSIONS.ATTENDANCE_SELF)).toBe(true);
    
    // Should NOT have manage or global permissions
    expect(roleHasPermission('EMPLOYEE', PERMISSIONS.EMPLOYEE_MANAGE)).toBe(false);
    expect(roleHasPermission('EMPLOYEE', PERMISSIONS.TENANT_MANAGE)).toBe(false);
  });

  it('denies CLIENT and CANDIDATE any permission by default', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(roleHasPermission('CLIENT', permission)).toBe(false);
      expect(roleHasPermission('CANDIDATE', permission)).toBe(false);
    }
  });

  it('scopes RECRUITER to recruitment only', () => {
    expect(roleHasPermission('RECRUITER', PERMISSIONS.RECRUITMENT_MANAGE)).toBe(true);
    expect(roleHasPermission('RECRUITER', PERMISSIONS.RECRUITMENT_READ)).toBe(true);
    expect(roleHasPermission('RECRUITER', PERMISSIONS.EMPLOYEE_CREATE)).toBe(false);
    expect(roleHasPermission('RECRUITER', PERMISSIONS.FINANCE_MANAGE)).toBe(false);
  });

  it('scopes FINANCE to finance only', () => {
    expect(roleHasPermission('FINANCE', PERMISSIONS.FINANCE_MANAGE)).toBe(true);
    expect(roleHasPermission('FINANCE', PERMISSIONS.FINANCE_READ)).toBe(true);
    expect(roleHasPermission('FINANCE', PERMISSIONS.PAYROLL_MANAGE)).toBe(false);
    expect(roleHasPermission('FINANCE', PERMISSIONS.RECRUITMENT_MANAGE)).toBe(false);
  });

  it('grants ADMIN tenant and user management permissions but not platform-wide tenant listing', () => {
    expect(roleHasPermission('ADMIN', PERMISSIONS.USER_INVITE)).toBe(true);
    expect(roleHasPermission('ADMIN', PERMISSIONS.EMPLOYEE_CREATE)).toBe(true);
    expect(roleHasPermission('ADMIN', PERMISSIONS.TENANT_LIST_ALL)).toBe(false);
  });

  it('every role listed in ROLE_PERMISSIONS only references known permissions', () => {
    const known = new Set(Object.values(PERMISSIONS));
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) expect(known.has(p)).toBe(true);
    }
  });
});
