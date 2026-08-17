import { describe, it, expect } from 'vitest';
import { isNavItemVisible, NAV_ITEMS } from './nav-items';
import type { AuthUser } from '../../modules/auth/types/auth.types';

function userWith(permissions: string[], role: AuthUser['role'] = 'EMPLOYEE'): Pick<AuthUser, 'role' | 'permissions'> {
  return { role, permissions };
}

describe('isNavItemVisible', () => {
  it('hides every item when there is no user', () => {
    for (const item of NAV_ITEMS) {
      expect(isNavItemVisible(item, null)).toBe(false);
    }
  });

  it('shows an ungated item (e.g. Dashboard) to any authenticated user', () => {
    const dashboard = NAV_ITEMS.find((i) => i.path === '/')!;
    expect(isNavItemVisible(dashboard, userWith([]))).toBe(true);
  });

  it('shows a permission-gated item only when the permission is held', () => {
    const employees = NAV_ITEMS.find((i) => i.path === '/employees')!;
    expect(isNavItemVisible(employees, userWith(['employee:read:tenant']))).toBe(true);
    expect(isNavItemVisible(employees, userWith(['employee:read:self']))).toBe(false);
  });

  it('shows an item gated on multiple permissions (anyOf) when any one is held', () => {
    const leaveApprovals = NAV_ITEMS.find((i) => i.path === '/leave/approvals')!;
    expect(isNavItemVisible(leaveApprovals, userWith(['leave:approve:manager']))).toBe(true);
    expect(isNavItemVisible(leaveApprovals, userWith(['leave:approve:hr']))).toBe(true);
    expect(isNavItemVisible(leaveApprovals, userWith(['leave:apply']))).toBe(false);
  });

  it('keeps a role-only item (no permission concept) gated strictly by role', () => {
    const roles = NAV_ITEMS.find((i) => i.path === '/roles')!;
    expect(isNavItemVisible(roles, userWith(['tenant:update'], 'ADMIN'))).toBe(false);
    expect(isNavItemVisible(roles, userWith([], 'SUPER_ADMIN'))).toBe(true);

    const companies = NAV_ITEMS.find((i) => i.path === '/companies')!;
    expect(isNavItemVisible(companies, userWith([], 'ADMIN'))).toBe(false);
    expect(isNavItemVisible(companies, userWith([], 'SUPER_ADMIN'))).toBe(true);
  });

  it('gates Finance on finance:read, independent of role', () => {
    const finance = NAV_ITEMS.find((i) => i.path === '/finance')!;
    expect(isNavItemVisible(finance, userWith(['finance:read']))).toBe(true);
    expect(isNavItemVisible(finance, userWith(['finance:manage']))).toBe(false); // read, not manage, is what's checked
  });

  it('gates Documents on document:view:self', () => {
    const documents = NAV_ITEMS.find((i) => i.path === '/documents')!;
    expect(isNavItemVisible(documents, userWith(['document:view:self']))).toBe(true);
    expect(isNavItemVisible(documents, userWith([]))).toBe(false);
  });

  it('gates Settings on tenant:update', () => {
    const settings = NAV_ITEMS.find((i) => i.path === '/settings')!;
    expect(isNavItemVisible(settings, userWith(['tenant:update']))).toBe(true);
    expect(isNavItemVisible(settings, userWith(['tenant:read']))).toBe(false);
  });

  it('gates Teams/Branches on org:manage', () => {
    const teams = NAV_ITEMS.find((i) => i.path === '/organization/teams')!;
    const branches = NAV_ITEMS.find((i) => i.path === '/organization/branches')!;
    expect(isNavItemVisible(teams, userWith(['org:manage']))).toBe(true);
    expect(isNavItemVisible(branches, userWith(['org:manage']))).toBe(true);
    expect(isNavItemVisible(teams, userWith([]))).toBe(false);
  });

  it('SUPER_ADMIN sees every item once granted the matching permission set', () => {
    const allPermissions = Array.from(
      new Set(NAV_ITEMS.flatMap((item) => (Array.isArray(item.permission) ? item.permission : item.permission ? [item.permission] : []))),
    );
    const superAdmin = userWith(allPermissions, 'SUPER_ADMIN');
    for (const item of NAV_ITEMS) {
      if (item.allow) continue; // role-only items (Companies, Roles & Permissions) are asserted above
      expect(isNavItemVisible(item, superAdmin)).toBe(true);
    }
  });
});
