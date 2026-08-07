import type { UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { logger } from '../logger.js';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, type Permission } from './permissions.js';

/**
 * Resolves a user's EFFECTIVE permission set: the static ROLE_PERMISSIONS[role] entry, unioned
 * with whatever the dynamic RBAC tables (Role/RolePermission/UserRoleAssignment,
 * DepartmentPermission, BranchPermission — see prisma/schema.prisma) additionally grant. Neither
 * layer replaces the other; a tenant that never touches the dynamic tables gets identical
 * behavior to before this module existed.
 *
 * In-memory cache, keyed by userId, single-instance TTL — same trade-off already accepted by
 * rate-limit.middleware.ts for this codebase's current (single Render instance) deployment. On
 * any DB error, resolution falls back to the static-only result and does NOT cache the failure,
 * so the next request retries the DB rather than being stuck degraded for the full TTL.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { permissions: Set<Permission>; expiresAt: number }>();

export async function resolveEffectivePermissions(userId: string, tenantId: string, role: UserRole): Promise<Set<Permission>> {
  // SUPER_ADMIN's unrestricted access is unconditional and never touches the DB or cache.
  if (role === 'SUPER_ADMIN') return new Set(ALL_PERMISSIONS);

  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;

  const staticPermissions = new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);

  try {
    const dynamicPermissions = await fetchDynamicPermissions(userId, tenantId);
    const merged = new Set<Permission>([...staticPermissions, ...dynamicPermissions]);
    cache.set(userId, { permissions: merged, expiresAt: Date.now() + CACHE_TTL_MS });
    return merged;
  } catch (err) {
    logger.warn({ err, userId }, 'Dynamic permission resolution failed — falling back to static role permissions');
    return staticPermissions;
  }
}

async function fetchDynamicPermissions(userId: string, tenantId: string): Promise<Permission[]> {
  const [roleAssignments, profile] = await Promise.all([
    prisma.userRoleAssignment.findMany({
      where: { userId, role: { deletedAt: null } },
      select: { role: { select: { permissions: { select: { permission: true } } } } },
    }),
    prisma.employeeProfile.findUnique({ where: { userId }, select: { department: true, branchId: true } }),
  ]);

  const permissions: string[] = [];
  for (const assignment of roleAssignments) {
    for (const rp of assignment.role.permissions) permissions.push(rp.permission);
  }

  const [departmentPermissions, branchPermissions] = await Promise.all([
    profile?.department
      ? prisma.departmentPermission.findMany({ where: { tenantId, department: profile.department }, select: { permission: true } })
      : Promise.resolve([]),
    profile?.branchId
      ? prisma.branchPermission.findMany({ where: { tenantId, branchId: profile.branchId }, select: { permission: true } })
      : Promise.resolve([]),
  ]);

  permissions.push(...departmentPermissions.map((p) => p.permission), ...branchPermissions.map((p) => p.permission));

  return permissions as Permission[];
}

/** Call after any write that changes a specific user's dynamic role assignments. */
export function invalidateUserPermissionCache(userId: string): void {
  cache.delete(userId);
}

/**
 * Call after any write to Role/RolePermission/DepartmentPermission/BranchPermission — those can
 * each affect many users at once (everyone assigned the role, everyone in the department/branch),
 * and enumerating the affected set isn't worth it at this scale. Clearing the whole cache just
 * means the next request per user recomputes; bounded by the same 60s TTL either way.
 */
export function invalidateAllPermissionCache(): void {
  cache.clear();
}
