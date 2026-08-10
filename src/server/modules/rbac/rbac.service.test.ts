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
