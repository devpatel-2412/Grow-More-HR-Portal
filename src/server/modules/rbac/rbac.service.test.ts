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
  return { actorUserId: 'actor-1', actorRole: 'ADMIN', tenantId: 'tenant-1', ...overrides };
}

function makeRole(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'role-1',
    tenantId: 'tenant-1',
    name: 'Custom Role',
    description: null,
    isSystem: false,
    deletedAt: null,
    permissions: [] as { id: string; permission: string }[],
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    findRoleByName: vi.fn().mockResolvedValue(null),
    findRoleById: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    softDeleteRole: vi.fn(),
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
  it('creates a role when every requested permission is within the actor\'s own effective set', async () => {
    const deps = makeDeps();
    deps.repository.createRole.mockResolvedValue(makeRole());
    deps.repository.findRoleById.mockResolvedValue(makeRole({ permissions: [{ id: 'p1', permission: 'employee:read:tenant' }] }));

    const service = build(deps);
    await service.createRole(makeCtx(), { name: 'Custom Role', permissions: ['employee:read:tenant'] } as never);

    expect(deps.repository.addRolePermissions).toHaveBeenCalledWith('role-1', ['employee:read:tenant']);
  });

  it('rejects creating a role that grants a permission the actor does not themselves hold', async () => {
    const deps = makeDeps();
    const service = build(deps);

    await expect(
      service.createRole(makeCtx(), { name: 'Sneaky Role', permissions: ['tenant:list:all'] } as never),
    ).rejects.toThrow(ForbiddenError);
    expect(deps.repository.createRole).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN can grant any permission, since their effective set is always everything', async () => {
    resolveEffectivePermissions.mockResolvedValue(new Set(['tenant:list:all', 'employee:create']));
    const deps = makeDeps();
    deps.repository.createRole.mockResolvedValue(makeRole());
    deps.repository.findRoleById.mockResolvedValue(makeRole());

    const service = build(deps);
    await expect(
      service.createRole(makeCtx({ actorRole: 'SUPER_ADMIN' }), { name: 'Powerful Role', permissions: ['tenant:list:all'] } as never),
    ).resolves.toBeDefined();
  });

  it('rejects assigning a single permission to an existing role that the actor does not hold', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole());
    const service = build(deps);

    await expect(service.assignPermission(makeCtx(), 'role-1', 'tenant:list:all' as never)).rejects.toThrow(ForbiddenError);
    expect(deps.repository.addRolePermissions).not.toHaveBeenCalled();
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

  it('rejects duplicating a role whose permissions exceed what the actor holds', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(
      makeRole({ permissions: [{ id: 'p1', permission: 'tenant:list:all' }] }),
    );
    const service = build(deps);

    await expect(service.duplicateRole(makeCtx(), 'role-1', 'Clone')).rejects.toThrow(ForbiddenError);
    expect(deps.repository.createRole).not.toHaveBeenCalled();
  });
});

describe('RbacService — core CRUD guards', () => {
  it('rejects creating a role whose name already exists for the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findRoleByName.mockResolvedValue(makeRole());
    const service = build(deps);

    await expect(service.createRole(makeCtx(), { name: 'Custom Role', permissions: [] } as never)).rejects.toThrow(ConflictError);
  });

  it('refuses to delete a system role', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole({ isSystem: true }));
    const service = build(deps);

    await expect(service.deleteRole(makeCtx(), 'role-1')).rejects.toThrow(ConflictError);
    expect(deps.repository.softDeleteRole).not.toHaveBeenCalled();
  });

  it('deletes a non-system role and invalidates the permission cache', async () => {
    const deps = makeDeps();
    deps.repository.findRoleById.mockResolvedValue(makeRole({ isSystem: false }));
    deps.repository.softDeleteRole.mockResolvedValue(undefined);
    const service = build(deps);

    await service.deleteRole(makeCtx(), 'role-1');
    expect(deps.repository.softDeleteRole).toHaveBeenCalledWith('role-1');
    expect(invalidateAllPermissionCache).toHaveBeenCalled();
  });

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
});
