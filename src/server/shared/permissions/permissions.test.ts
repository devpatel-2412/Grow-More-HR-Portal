import { describe, it, expect } from 'vitest';
import { roleHasPermission, PERMISSIONS, ROLE_PERMISSIONS } from './permissions.js';

describe('permissions', () => {
  it('grants SUPER_ADMIN every permission in the catalogue', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(roleHasPermission('SUPER_ADMIN', permission)).toBe(true);
    }
  });

  it('denies EMPLOYEE and CLIENT any permission by default', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(roleHasPermission('EMPLOYEE', permission)).toBe(false);
      expect(roleHasPermission('CLIENT', permission)).toBe(false);
    }
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
