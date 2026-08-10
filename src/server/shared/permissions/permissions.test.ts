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

    // Should NOT have tenant-wide or admin-only permissions
    expect(roleHasPermission('EMPLOYEE', PERMISSIONS.EMPLOYEE_CREATE)).toBe(false);
    expect(roleHasPermission('EMPLOYEE', PERMISSIONS.TENANT_UPDATE)).toBe(false);
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

  it('has exactly the 6 fixed roles — no custom roles', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(
      ['ADMIN', 'EMPLOYEE', 'HR_MANAGER', 'PROJECT_MANAGER', 'SUPER_ADMIN', 'TEAM_LEADER'].sort(),
    );
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
    expect(INVITABLE_ROLES.ADMIN).toContain('PROJECT_MANAGER');
    expect(INVITABLE_ROLES.ADMIN).toContain('TEAM_LEADER');
    expect(INVITABLE_ROLES.ADMIN).toContain('EMPLOYEE');
    expect(INVITABLE_ROLES.ADMIN).not.toContain('SUPER_ADMIN');
    expect(INVITABLE_ROLES.ADMIN).not.toContain('ADMIN');
  });

  it('restricts HR_MANAGER and PROJECT_MANAGER to inviting EMPLOYEE only, once granted the ability at all', () => {
    expect(INVITABLE_ROLES.HR_MANAGER).toEqual(['EMPLOYEE']);
    expect(INVITABLE_ROLES.PROJECT_MANAGER).toEqual(['EMPLOYEE']);
  });

  it('grants no invite ability by default to line roles (TEAM_LEADER, EMPLOYEE)', () => {
    for (const role of ['TEAM_LEADER', 'EMPLOYEE'] as const) {
      expect(INVITABLE_ROLES[role]).toEqual([]);
    }
  });

  it('no longer grants USER_INVITE to HR_MANAGER by default — it must be granted per-tenant via the dynamic RBAC layer', () => {
    expect(roleHasPermission('HR_MANAGER', PERMISSIONS.USER_INVITE)).toBe(false);
  });
});
