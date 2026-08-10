import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RbacService, type RbacRequestContext } from './rbac.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

const { resolveEffectivePermissions, invalidateAllPermissionCache } = vi.hoisted(() => ({
  resolveEffectivePermissions: vi.fn(),
  invalidateAllPermissionCache: vi.fn(),
}));
vi.mock('../../shared/permissions/permission-resolver.service.js', () => ({
  resolveEffectivePermissions,
  invalidateAllPermissionCache,
}));

function makeCtx(overrides: Partial<RbacRequestContext> = {}): RbacRequestContext {
  // SUPER_ADMIN is the only role that can ever reach this service — see rbac.routes.ts's
  // requireRole('SUPER_ADMIN') gate — but the escalation guard itself is role-agnostic, so these
  // tests exercise it directly against whatever effective set resolveEffectivePermissions returns.
  return { actorUserId: 'actor-1', actorRole: 'SUPER_ADMIN', tenantId: 'tenant-1', ...overrides };
}

function makeRole(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'role-1',
    tenantId: 'tenant-1',
    name: 'HR_MANAGER',
    description: null,
    isSystem: true,
    deletedAt: null,
    permissions: [] as { id: string; permission: string }[],
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    findRoleByName: vi.fn().mockResolvedValue(null),
    findRoleById: vi.fn(),
    findRolesByTenant: vi.fn(),
    createRole: vi.fn().mockImplementation(({ name }: { name: string }) => Promise.resolve(makeRole({ id: `role-${name}`, name }))),
    addRolePermissions: vi.fn().mockResolvedValue(undefined),
    removeRolePermission: vi.fn().mockResolvedValue(undefined),
    findUserRoleAssignment: vi.fn().mockResolvedValue(null),
    assignRoleToUser: vi.fn(),
    removeRoleFromUser: vi.fn().mockResolvedValue(undefined),
    findDepartmentPermissions: vi.fn(),
    createDepartmentPermission: vi.fn(),
    deleteDepartmentPermission: vi.fn(),
    findBranchPermissions: vi.fn(),
    createBranchPermission: vi.fn(),
    deleteBranchPermission: vi.fn(),
    findBranchById: vi.fn(),
    findUserRoleAssignments: vi.fn(),
  };
  const userRepository = { findById: vi.fn() };
  return { repository, userRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new RbacService(deps.repository as never, deps.userRepository as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveEffectivePermissions.mockResolvedValue(new Set(['employee:read:tenant', 'employee:create']));
});

describe('RbacService — privilege escalation guard', () => {
  it('assigns a permission when it is within the actor\'s own effective set', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole());

    const service = build(deps);
    await service.assignPermission(makeCtx(), 'role-1', 'employee:read:tenant' as never);

    expect(deps.repository.addRolePermissions).toHaveBeenCalledWith('role-1', ['employee:read:tenant']);
    expect(invalidateAllPermissionCache).toHaveBeenCalled();
  });

  it('rejects assigning a permission the actor does not themselves hold', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole());
    const service = build(deps);

    await expect(service.assignPermission(makeCtx(), 'role-1', 'tenant:list:all' as never)).rejects.toThrow(ForbiddenError);
    expect(deps.repository.addRolePermissions).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN can grant any permission, since their effective set is always everything', async () => {
    resolveEffectivePermissions.mockResolvedValue(new Set(['tenant:list:all', 'employee:create']));
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole());

    const service = build(deps);
    await expect(service.assignPermission(makeCtx({ actorRole: 'SUPER_ADMIN' }), 'role-1', 'tenant:list:all' as never)).resolves.toBeUndefined();
  });

  it('rejects assigning a user a role whose permissions exceed what the actor holds', async () => {
    const deps = makeDeps();
    deps.userRepository.findById.mockResolvedValue({ id: 'target-user', tenantId: 'tenant-1' });
    deps.repository.findRoleById.mockResolvedValue(
      makeRole({ permissions: [{ id: 'p1', permission: 'tenant:list:all' }] }),
    );
    const service = build(deps);

    await expect(service.assignRoleToUser(makeCtx(), 'target-user', 'role-1')).rejects.toThrow(ForbiddenError);
    expect(deps.repository.assignRoleToUser).not.toHaveBeenCalled();
  });
});

describe('RbacService — core guards', () => {
  it('throws NotFoundError for a role belonging to a different tenant', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole({ tenantId: 'other-tenant' }));
    const service = build(deps);

    await expect(service.getRole('tenant-1', 'role-1')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for a soft-deleted role', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole({ deletedAt: new Date() }));
    const service = build(deps);

    await expect(service.getRole('tenant-1', 'role-1')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError assigning a role to a user outside the tenant', async () => {
    const deps = makeDeps();
    deps.userRepository.findById.mockResolvedValue({ id: 'target-user', tenantId: 'other-tenant' });
    const service = build(deps);

    await expect(service.assignRoleToUser(makeCtx(), 'target-user', 'role-1')).rejects.toThrow(NotFoundError);
  });

  it('rejects assigning a role a user already has', async () => {
    const deps = makeDeps();
    deps.userRepository.findById.mockResolvedValue({ id: 'target-user', tenantId: 'tenant-1' });
    deps.repository.findRoleById.mockResolvedValue(makeRole());
    deps.repository.findUserRoleAssignment.mockResolvedValue({ id: 'assignment-1' });
    const service = build(deps);

    await expect(service.assignRoleToUser(makeCtx(), 'target-user', 'role-1')).rejects.toThrow(ConflictError);
    expect(deps.repository.assignRoleToUser).not.toHaveBeenCalled();
  });

  it('listRoles always delegates to the tenant-scoped, name-filtered repository query', async () => {
    const deps = makeDeps();
    deps.repository.findRolesByTenant.mockResolvedValue([makeRole()]);
    const service = build(deps);

    const roles = await service.listRoles('tenant-1');

    expect(deps.repository.findRolesByTenant).toHaveBeenCalledWith('tenant-1');
    expect(roles).toEqual([makeRole()]);
  });
});

describe('RbacService.listRoles — auto-heals tenants that predate RBAC seeding', () => {
  // Reproduces the reported bug: a tenant created before dynamic RBAC existed (or whose one-off
  // backfill script was never run) has zero Role rows, so the Roles & Permissions page showed
  // "This role hasn't been initialized for your company yet" for every one of the 5 configurable
  // roles — TEAM_LEADER included, even though it's a real, always-valid fixed role.
  const ALL_FIVE = ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];

  it('creates all 5 configurable roles (never SUPER_ADMIN) when the tenant has none yet', async () => {
    const deps = makeDeps();
    deps.repository.findRoleByName.mockResolvedValue(null); // nothing exists yet, for any role
    deps.repository.findRolesByTenant.mockResolvedValue([]);
    const service = build(deps);

    await service.listRoles('tenant-1');

    const createdNames = deps.repository.createRole.mock.calls.map(([data]: [{ name: string }]) => data.name);
    expect(createdNames.sort()).toEqual([...ALL_FIVE].sort());
    expect(createdNames).not.toContain('SUPER_ADMIN');
    expect(deps.repository.addRolePermissions).toHaveBeenCalledTimes(5);
  });

  it('specifically initializes TEAM_LEADER with a real starting permission set', async () => {
    const deps = makeDeps();
    deps.repository.findRoleByName.mockResolvedValue(null);
    deps.repository.findRolesByTenant.mockResolvedValue([]);
    const service = build(deps);

    await service.listRoles('tenant-1');

    expect(deps.repository.createRole).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', name: 'TEAM_LEADER', isSystem: true }),
    );
    const teamLeaderCall = deps.repository.addRolePermissions.mock.calls.find(([roleId]: [string]) => roleId === 'role-TEAM_LEADER');
    expect(teamLeaderCall?.[1]?.length).toBeGreaterThan(0);
  });

  it('never recreates or touches a role that already exists — idempotent, does not overwrite customized permissions', async () => {
    const deps = makeDeps();
    // TEAM_LEADER (and only TEAM_LEADER) is already initialized — e.g. a SUPER_ADMIN previously
    // cleared it down to a custom permission set. The other 4 are still missing.
    deps.repository.findRoleByName.mockImplementation((_tenantId: string, name: string) =>
      Promise.resolve(name === 'TEAM_LEADER' ? makeRole({ id: 'role-TEAM_LEADER', name: 'TEAM_LEADER' }) : null),
    );
    deps.repository.findRolesByTenant.mockResolvedValue([]);
    const service = build(deps);

    await service.listRoles('tenant-1');

    const createdNames = deps.repository.createRole.mock.calls.map(([data]: [{ name: string }]) => data.name);
    expect(createdNames).not.toContain('TEAM_LEADER');
    expect(createdNames.sort()).toEqual(['ADMIN', 'EMPLOYEE', 'HR_MANAGER', 'PROJECT_MANAGER'].sort());
  });

  it('running listRoles twice in a row creates no duplicates the second time', async () => {
    const deps = makeDeps();
    const existing = new Map<string, unknown>();
    deps.repository.findRoleByName.mockImplementation((_tenantId: string, name: string) => Promise.resolve(existing.get(name) ?? null));
    deps.repository.createRole.mockImplementation(({ name }: { name: string }) => {
      const role = makeRole({ id: `role-${name}`, name });
      existing.set(name, role);
      return Promise.resolve(role);
    });
    deps.repository.findRolesByTenant.mockResolvedValue([]);
    const service = build(deps);

    await service.listRoles('tenant-1');
    expect(deps.repository.createRole).toHaveBeenCalledTimes(5);

    deps.repository.createRole.mockClear();
    deps.repository.addRolePermissions.mockClear();
    await service.listRoles('tenant-1');

    expect(deps.repository.createRole).not.toHaveBeenCalled();
    expect(deps.repository.addRolePermissions).not.toHaveBeenCalled();
  });
});
