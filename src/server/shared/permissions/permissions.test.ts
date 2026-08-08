import { describe, it, expect } from 'vitest';
import { roleHasPermission, PERMISSIONS, ROLE_PERMISSIONS, INVITABLE_ROLES } from './permissions.js';

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

describe('INVITABLE_ROLES — enterprise invitation hierarchy', () => {
  it('has an entry for every role in the catalogue', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(INVITABLE_ROLES).toHaveProperty(role);
    }
  });

  it('lets SUPER_ADMIN invite every known role, including itself', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      expect(INVITABLE_ROLES.SUPER_ADMIN).toContain(role);
    }
  });

  it('lets ADMIN invite staff roles but never SUPER_ADMIN or ADMIN itself', () => {
    expect(INVITABLE_ROLES.ADMIN).toContain('HR_MANAGER');
    expect(INVITABLE_ROLES.ADMIN).toContain('EMPLOYEE');
    expect(INVITABLE_ROLES.ADMIN).not.toContain('SUPER_ADMIN');
    expect(INVITABLE_ROLES.ADMIN).not.toContain('ADMIN');
  });

  it('restricts HR_MANAGER to inviting EMPLOYEE only, once granted the ability at all', () => {
    expect(INVITABLE_ROLES.HR_MANAGER).toEqual(['EMPLOYEE']);
  });

  it('grants no invite ability by default to line roles (EMPLOYEE, RECRUITER, FINANCE, HR_EXECUTIVE, TEAM_LEADER, ACCOUNTS, CLIENT, CANDIDATE)', () => {
    for (const role of ['EMPLOYEE', 'RECRUITER', 'FINANCE', 'HR_EXECUTIVE', 'TEAM_LEADER', 'ACCOUNTS', 'CLIENT', 'CANDIDATE'] as const) {
      expect(INVITABLE_ROLES[role]).toEqual([]);
    }
  });

  it('no longer grants USER_INVITE to HR_MANAGER by default — it must be granted per-tenant via the dynamic RBAC layer', () => {
    expect(roleHasPermission('HR_MANAGER', PERMISSIONS.USER_INVITE)).toBe(false);
  });
});
