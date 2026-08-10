import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedSystemRolesForTenant, SYSTEM_ROLE_DESCRIPTIONS } from './rbac-seed.util.js';
import { ROLE_PERMISSIONS } from '../../shared/permissions/permissions.js';

const FIXED_CONFIGURABLE_ROLES = ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] as const;

function makeRepository() {
  const store = new Map<string, { id: string; tenantId: string; name: string }>();
  return {
    findRoleByName: vi.fn(async (tenantId: string, name: string) => store.get(name) ?? null),
    createRole: vi.fn(async (data: { tenantId: string; name: string; description?: string; isSystem?: boolean }) => {
      const row = { id: `role-${data.name}`, tenantId: data.tenantId, name: data.name };
      store.set(data.name, row);
      return row;
    }),
    addRolePermissions: vi.fn().mockResolvedValue(undefined),
    _store: store,
  };
}

describe('seedSystemRolesForTenant', () => {
  let repository: ReturnType<typeof makeRepository>;

  beforeEach(() => {
    repository = makeRepository();
  });

  it('creates exactly the 5 configurable roles for a brand new tenant — never SUPER_ADMIN', async () => {
    const result = await seedSystemRolesForTenant('tenant-1', repository as never);

    expect(result.created.sort()).toEqual([...FIXED_CONFIGURABLE_ROLES].sort());
    expect(result.skipped).toEqual([]);
    expect(repository.createRole).toHaveBeenCalledTimes(5);
    expect(repository.createRole.mock.calls.map(([data]) => data.name)).not.toContain('SUPER_ADMIN');
  });

  it('seeds each role tagged isSystem with its documented description', async () => {
    await seedSystemRolesForTenant('tenant-1', repository as never);

    for (const role of FIXED_CONFIGURABLE_ROLES) {
      expect(repository.createRole).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        name: role,
        description: SYSTEM_ROLE_DESCRIPTIONS[role],
        isSystem: true,
      });
    }
  });

  it('seeds TEAM_LEADER specifically with a non-empty starting permission set', async () => {
    await seedSystemRolesForTenant('tenant-1', repository as never);

    expect(repository.addRolePermissions).toHaveBeenCalledWith('role-TEAM_LEADER', ROLE_PERMISSIONS.TEAM_LEADER);
    expect(ROLE_PERMISSIONS.TEAM_LEADER.length).toBeGreaterThan(0);
  });

  it('seeds every one of the 5 roles with its own ROLE_PERMISSIONS starting set', async () => {
    await seedSystemRolesForTenant('tenant-1', repository as never);

    for (const role of FIXED_CONFIGURABLE_ROLES) {
      expect(repository.addRolePermissions).toHaveBeenCalledWith(`role-${role}`, ROLE_PERMISSIONS[role]);
    }
  });

  it('is idempotent — skips a role that already has a row instead of recreating it', async () => {
    // Simulate TEAM_LEADER already being initialized (e.g. from a prior partial seed).
    repository._store.set('TEAM_LEADER', { id: 'existing-team-leader', tenantId: 'tenant-1', name: 'TEAM_LEADER' });

    const result = await seedSystemRolesForTenant('tenant-1', repository as never);

    expect(result.skipped).toEqual(['TEAM_LEADER']);
    expect(result.created.sort()).toEqual(['ADMIN', 'EMPLOYEE', 'HR_MANAGER', 'PROJECT_MANAGER'].sort());
    expect(repository.createRole).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'TEAM_LEADER' }));
  });

  it('running the seed twice creates nothing new the second time (safe to call repeatedly)', async () => {
    await seedSystemRolesForTenant('tenant-1', repository as never);
    repository.createRole.mockClear();
    repository.addRolePermissions.mockClear();

    const second = await seedSystemRolesForTenant('tenant-1', repository as never);

    expect(second.created).toEqual([]);
    expect(second.skipped.sort()).toEqual([...FIXED_CONFIGURABLE_ROLES].sort());
    expect(repository.createRole).not.toHaveBeenCalled();
    expect(repository.addRolePermissions).not.toHaveBeenCalled();
  });

  it('scopes seeding to the given tenant only', async () => {
    await seedSystemRolesForTenant('tenant-1', repository as never);

    for (const [data] of repository.createRole.mock.calls) {
      expect(data.tenantId).toBe('tenant-1');
    }
  });
});
