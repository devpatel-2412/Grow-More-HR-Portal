import type { UserRole } from '@prisma/client';
import { RbacRepository } from './rbac.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { resolveEffectivePermissions, invalidateAllPermissionCache } from '../../shared/permissions/permission-resolver.service.js';
import type { Permission } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type { createRoleSchema, updateRoleSchema } from './rbac.validators.js';

export interface RbacRequestContext {
  actorUserId: string;
  actorRole: UserRole;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class RbacService {
  constructor(
    private readonly repository: RbacRepository = new RbacRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  /**
   * The core privilege-escalation guard: nobody — including an ADMIN managing roles — can grant a
   * permission they don't themselves effectively hold right now (static + their own dynamic
   * grants). SUPER_ADMIN's effective set is unconditionally "everything," so this never blocks
   * a SUPER_ADMIN. Checked on every write that grants a permission to anything.
   */
  private async assertNotEscalating(ctx: RbacRequestContext, permissionsToGrant: Permission[]): Promise<void> {
    if (permissionsToGrant.length === 0) return;
    const effective = await resolveEffectivePermissions(ctx.actorUserId, ctx.tenantId, ctx.actorRole);
    const disallowed = permissionsToGrant.filter((p) => !effective.has(p));
    if (disallowed.length > 0) {
      throw new ForbiddenError(`You cannot grant permission(s) you don't hold: ${disallowed.join(', ')}`);
    }
  }

  async listRoles(tenantId: string) {
    return this.repository.findRolesByTenant(tenantId);
  }

  async getRole(tenantId: string, id: string) {
    const role = await this.repository.findRoleById(id);
    if (!role || role.tenantId !== tenantId || role.deletedAt) throw new NotFoundError('Role not found');
    return role;
  }

  async createRole(ctx: RbacRequestContext, input: z.infer<typeof createRoleSchema>) {
    const existing = await this.repository.findRoleByName(ctx.tenantId, input.name);
    if (existing) throw new ConflictError('A role with this name already exists');

    await this.assertNotEscalating(ctx, input.permissions);

    const role = await this.repository.createRole({ tenantId: ctx.tenantId, name: input.name, description: input.description });
    if (input.permissions.length > 0) {
      await this.repository.addRolePermissions(role.id, input.permissions);
    }
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'ROLE_CREATED',
      targetType: 'Role',
      targetId: role.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { name: input.name, permissions: input.permissions },
    });
    return this.getRole(ctx.tenantId, role.id);
  }

  async updateRole(ctx: RbacRequestContext, id: string, input: z.infer<typeof updateRoleSchema>) {
    const role = await this.getRole(ctx.tenantId, id);
    if (input.name && input.name !== role.name) {
      const existing = await this.repository.findRoleByName(ctx.tenantId, input.name);
      if (existing) throw new ConflictError('A role with this name already exists');
    }
    const updated = await this.repository.updateRole(id, { name: input.name, description: input.description });
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'ROLE_UPDATED',
      targetType: 'Role',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: input,
    });
    return updated;
  }

  async deleteRole(ctx: RbacRequestContext, id: string) {
    const role = await this.getRole(ctx.tenantId, id);
    if (role.isSystem) throw new ConflictError('System roles (seeded from the built-in staff roles) cannot be deleted');
    await this.repository.softDeleteRole(id);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'ROLE_DELETED',
      targetType: 'Role',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async duplicateRole(ctx: RbacRequestContext, id: string, newName: string) {
    const source = await this.getRole(ctx.tenantId, id);
    const existing = await this.repository.findRoleByName(ctx.tenantId, newName);
    if (existing) throw new ConflictError('A role with this name already exists');

    const permissions = source.permissions.map((p) => p.permission) as Permission[];
    await this.assertNotEscalating(ctx, permissions);

    const clone = await this.repository.createRole({ tenantId: ctx.tenantId, name: newName, description: source.description ?? undefined });
    if (permissions.length > 0) {
      await this.repository.addRolePermissions(clone.id, permissions);
    }
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'ROLE_DUPLICATED',
      targetType: 'Role',
      targetId: clone.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { sourceRoleId: id, name: newName },
    });
    return this.getRole(ctx.tenantId, clone.id);
  }

  async assignPermission(ctx: RbacRequestContext, roleId: string, permission: Permission) {
    await this.getRole(ctx.tenantId, roleId);
    await this.assertNotEscalating(ctx, [permission]);
    await this.repository.addRolePermissions(roleId, [permission]);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'PERMISSION_ASSIGNED',
      targetType: 'Role',
      targetId: roleId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { permission },
    });
  }

  async removePermission(ctx: RbacRequestContext, roleId: string, permission: string) {
    await this.getRole(ctx.tenantId, roleId);
    await this.repository.removeRolePermission(roleId, permission);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'PERMISSION_REMOVED',
      targetType: 'Role',
      targetId: roleId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { permission },
    });
  }

  async listDepartmentPermissions(tenantId: string) {
    return this.repository.findDepartmentPermissions(tenantId);
  }

  async createDepartmentPermission(ctx: RbacRequestContext, department: string, permission: Permission) {
    await this.assertNotEscalating(ctx, [permission]);
    const created = await this.repository.createDepartmentPermission(ctx.tenantId, department, permission);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'PERMISSION_ASSIGNED',
      targetType: 'DepartmentPermission',
      targetId: created.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { department, permission },
    });
    return created;
  }

  async deleteDepartmentPermission(ctx: RbacRequestContext, id: string) {
    await this.repository.deleteDepartmentPermission(ctx.tenantId, id);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'PERMISSION_REMOVED',
      targetType: 'DepartmentPermission',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async listBranchPermissions(tenantId: string) {
    return this.repository.findBranchPermissions(tenantId);
  }

  async createBranchPermission(ctx: RbacRequestContext, branchId: string, permission: Permission) {
    const branch = await this.repository.findBranchById(ctx.tenantId, branchId);
    if (!branch) throw new NotFoundError('Branch not found');
    await this.assertNotEscalating(ctx, [permission]);
    const created = await this.repository.createBranchPermission(ctx.tenantId, branchId, permission);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'PERMISSION_ASSIGNED',
      targetType: 'BranchPermission',
      targetId: created.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { branchId, permission },
    });
    return created;
  }

  async deleteBranchPermission(ctx: RbacRequestContext, id: string) {
    await this.repository.deleteBranchPermission(ctx.tenantId, id);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'PERMISSION_REMOVED',
      targetType: 'BranchPermission',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async listUserRoles(tenantId: string, userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId) throw new NotFoundError('User not found');
    return this.repository.findUserRoleAssignments(userId);
  }

  async assignRoleToUser(ctx: RbacRequestContext, userId: string, roleId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.tenantId !== ctx.tenantId) throw new NotFoundError('User not found');
    const role = await this.getRole(ctx.tenantId, roleId);

    const existing = await this.repository.findUserRoleAssignment(userId, roleId);
    if (existing) throw new ConflictError('User already has this role assigned');

    const permissions = role.permissions.map((p) => p.permission) as Permission[];
    await this.assertNotEscalating(ctx, permissions);

    const assignment = await this.repository.assignRoleToUser(userId, roleId, ctx.actorUserId);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_ROLE_ASSIGNED',
      targetType: 'User',
      targetId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { roleId, roleName: role.name },
    });
    return assignment;
  }

  async removeRoleFromUser(ctx: RbacRequestContext, userId: string, roleId: string) {
    await this.repository.removeRoleFromUser(userId, roleId);
    invalidateAllPermissionCache();
    await auditLogService.record({
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_ROLE_REMOVED',
      targetType: 'User',
      targetId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { roleId },
    });
  }
}

export const rbacService = new RbacService();
