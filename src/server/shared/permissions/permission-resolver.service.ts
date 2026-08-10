import type { UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { logger } from '../logger.js';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, type Permission } from './permissions.js';

/**
 * Resolves a user's EFFECTIVE permission set.
 *
 * SUPER_ADMIN is unconditional — always every permission, never touches the DB or cache. For the
 * other 5 fixed roles, the base permission set is NOT hardcoded: it comes from the tenant's
 * `isSystem` Role row whose name matches the user's role (seeded once per tenant, then edited
 * live from the Roles & Permissions page — see rbac-seed.util.ts and rbac.service.ts's
 * assignPermission/removePermission). The static ROLE_PERMISSIONS map is used only as a fallback
 * when that row doesn't exist at all (a tenant that hasn't been seeded yet, or a DB error) — an
 * existing row with zero permissions is a deliberate "nothing granted" state and must NOT fall
 * back to static, or unchecking every box on the page would silently do nothing.
 *
 * That base is then unioned with whatever DepartmentPermission/BranchPermission additionally
 * grant (unrelated, per-employee scoping that predates and is orthogonal to this redesign) and
 * whatever UserRoleAssignment grants (legacy per-user extra-role linkage — no UI creates new
 * assignable roles anymore, so this union is normally a no-op, kept only for backward
 * compatibility with any assignment made before custom roles were removed).
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

  try {
    const merged = await fetchEffectivePermissions(userId, tenantId, role);
    cache.set(userId, { permissions: merged, expiresAt: Date.now() + CACHE_TTL_MS });
    return merged;
  } catch (err) {
    logger.warn({ err, userId }, 'Dynamic permission resolution failed — falling back to static role permissions');
    return new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);
  }
}

async function fetchEffectivePermissions(userId: string, tenantId: string, role: UserRole): Promise<Set<Permission>> {
  const [systemRole, roleAssignments, profile] = await Promise.all([
    prisma.role.findFirst({
      where: { tenantId, name: role, deletedAt: null },
      select: { permissions: { select: { permission: true } } },
    }),
    prisma.userRoleAssignment.findMany({
      where: { userId, role: { deletedAt: null } },
      select: { role: { select: { permissions: { select: { permission: true } } } } },
    }),
    prisma.employeeProfile.findUnique({ where: { userId }, select: { department: true, branchId: true } }),
  ]);

  // `systemRole` present (even with zero permission rows) means the tenant's Roles & Permissions
  // page is the source of truth for this role — only fall back to the static defaults when the
  // row itself doesn't exist yet (e.g. a tenant created before seeding ran).
  const base: Permission[] = systemRole
    ? systemRole.permissions.map((p) => p.permission as Permission)
    : (ROLE_PERMISSIONS[role] ?? []);

  const permissions: string[] = [...base];
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

  return new Set(permissions as Permission[]);
}

/** Call after any write that changes a specific user's dynamic role assignments. */
export function invalidateUserPermissionCache(userId: string): void {
  cache.delete(userId);
}

/**
 * Call after any write to Role/RolePermission/DepartmentPermission/BranchPermission — those can
 * each affect many users at once (everyone holding the role, everyone in the department/branch),
 * and enumerating the affected set isn't worth it at this scale. Clearing the whole cache just
 * means the next request per user recomputes; bounded by the same 60s TTL either way.
 */
export function invalidateAllPermissionCache(): void {
  cache.clear();
}
