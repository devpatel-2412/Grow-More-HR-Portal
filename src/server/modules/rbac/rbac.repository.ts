import { prisma } from '../../db/prisma.js';

const roleWithPermissions = { permissions: true } as const;

/**
 * The 5 non-SUPER_ADMIN fixed roles a Role row can legitimately be named — SUPER_ADMIN never gets
 * one (its access is hardcoded, never DB-driven; see permission-resolver.service.ts). Filtering by
 * name here, not just relying on nothing creating other rows, is what guarantees "6 Roles" holds
 * even for a tenant seeded before roles were fixed (a stale row from an old custom role stays
 * invisible and inert rather than needing every historical tenant migrated first).
 */
const FIXED_ROLE_NAMES = ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] as const;

export class RbacRepository {
  findRolesByTenant(tenantId: string) {
    return prisma.role.findMany({
      where: { tenantId, deletedAt: null, name: { in: [...FIXED_ROLE_NAMES] } },
      include: roleWithPermissions,
      orderBy: { name: 'asc' },
    });
  }

  findRoleById(id: string) {
    return prisma.role.findUnique({ where: { id }, include: roleWithPermissions });
  }

  findRoleByName(tenantId: string, name: string) {
    return prisma.role.findFirst({ where: { tenantId, name, deletedAt: null } });
  }

  createRole(data: { tenantId: string; name: string; description?: string; isSystem?: boolean }) {
    return prisma.role.create({ data });
  }

  updateRole(id: string, data: { name?: string; description?: string }) {
    return prisma.role.update({ where: { id }, data });
  }

  softDeleteRole(id: string) {
    return prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  addRolePermissions(roleId: string, permissions: string[]) {
    return prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId, permission })),
      skipDuplicates: true,
    });
  }

  removeRolePermission(roleId: string, permission: string) {
    return prisma.rolePermission.deleteMany({ where: { roleId, permission } });
  }

  findUserRoleAssignments(userId: string) {
    return prisma.userRoleAssignment.findMany({ where: { userId }, include: { role: true } });
  }

  findUserRoleAssignment(userId: string, roleId: string) {
    return prisma.userRoleAssignment.findUnique({ where: { userId_roleId: { userId, roleId } } });
  }

  assignRoleToUser(userId: string, roleId: string, assignedById?: string) {
    return prisma.userRoleAssignment.create({ data: { userId, roleId, assignedById } });
  }

  removeRoleFromUser(userId: string, roleId: string) {
    return prisma.userRoleAssignment.deleteMany({ where: { userId, roleId } });
  }

  findDepartmentPermissions(tenantId: string) {
    return prisma.departmentPermission.findMany({ where: { tenantId }, orderBy: { department: 'asc' } });
  }

  createDepartmentPermission(tenantId: string, department: string, permission: string) {
    return prisma.departmentPermission.create({ data: { tenantId, department, permission } });
  }

  deleteDepartmentPermission(tenantId: string, id: string) {
    return prisma.departmentPermission.deleteMany({ where: { id, tenantId } });
  }

  findBranchPermissions(tenantId: string) {
    return prisma.branchPermission.findMany({ where: { tenantId }, include: { branch: true }, orderBy: { createdAt: 'desc' } });
  }

  createBranchPermission(tenantId: string, branchId: string, permission: string) {
    return prisma.branchPermission.create({ data: { tenantId, branchId, permission } });
  }

  deleteBranchPermission(tenantId: string, id: string) {
    return prisma.branchPermission.deleteMany({ where: { id, tenantId } });
  }

  findBranchById(tenantId: string, branchId: string) {
    return prisma.branch.findFirst({ where: { id: branchId, tenantId } });
  }
}
