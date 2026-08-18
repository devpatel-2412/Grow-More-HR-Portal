import type { UserRole } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { logger } from '../logger.js';
import { getRedisClient } from '../redis.client.js';
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
 * Cache: an in-process Map, always — this is what every deployment uses today (single instance),
 * and stays the *only* store when REDIS_URL isn't configured (see redis.client.ts). Once it is,
 * every read/write also goes through Redis, so a permission change takes effect for every server
 * instance within the same short TTL instead of only the instance that happened to serve the
 * write — without Redis, a second instance's in-memory cache wouldn't hear about a revoked
 * permission until its own independent TTL expired. The in-memory Map is still checked first even
 * when Redis is available (a same-instance L1 cache in front of Redis), since it's strictly
 * cheaper than a network round trip for repeat requests within the same process.
 */
const CACHE_TTL_MS = 60_000;
const CACHE_TTL_SECONDS = CACHE_TTL_MS / 1000;
const REDIS_KEY_PREFIX = 'perm-cache:';

const memoryCache = new Map<string, { permissions: Set<Permission>; expiresAt: number }>();

export async function resolveEffectivePermissions(userId: string, tenantId: string, role: UserRole): Promise<Set<Permission>> {
  // SUPER_ADMIN's unrestricted access is unconditional and never touches the DB or cache.
  if (role === 'SUPER_ADMIN') return new Set(ALL_PERMISSIONS);

  const cached = await readCache(userId);
  if (cached) return cached;

  try {
    const merged = await fetchEffectivePermissions(userId, tenantId, role);
    await writeCache(userId, merged);
    return merged;
  } catch (err) {
    logger.warn({ err, userId }, 'Dynamic permission resolution failed — falling back to static role permissions');
    return new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);
  }
}

async function readCache(userId: string): Promise<Set<Permission> | null> {
  const memHit = memoryCache.get(userId);
  if (memHit && memHit.expiresAt > Date.now()) return memHit.permissions;

  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(REDIS_KEY_PREFIX + userId);
    if (!raw) return null;
    const permissions = new Set(JSON.parse(raw) as Permission[]);
    // Populate this instance's own L1 cache too, so the next call within the TTL doesn't need
    // even the Redis round trip.
    memoryCache.set(userId, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
  } catch (err) {
    logger.warn({ err, userId }, 'Redis permission-cache read failed — resolving fresh from the database');
    return null;
  }
}

async function writeCache(userId: string, permissions: Set<Permission>): Promise<void> {
  memoryCache.set(userId, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });

  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(REDIS_KEY_PREFIX + userId, JSON.stringify([...permissions]), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, userId }, 'Redis permission-cache write failed — this instance still has its in-memory copy');
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

/** Call after any write that changes a specific user's dynamic role assignments. Synchronous by
 * design (matches its existing call sites) — the Redis side of the invalidation, when configured,
 * runs fire-and-forget rather than being awaited here. */
export function invalidateUserPermissionCache(userId: string): void {
  memoryCache.delete(userId);

  const redis = getRedisClient();
  if (!redis) return;
  redis.del(REDIS_KEY_PREFIX + userId).catch((err: unknown) => {
    logger.warn({ err, userId }, 'Redis permission-cache invalidation failed');
  });
}

/**
 * Call after any write to Role/RolePermission/DepartmentPermission/BranchPermission — those can
 * each affect many users at once (everyone holding the role, everyone in the department/branch),
 * and enumerating the affected set isn't worth it at this scale. Clearing the whole cache just
 * means the next request per user recomputes; bounded by the same TTL either way. Synchronous by
 * design (matches its existing call sites) — the Redis side, when configured, runs fire-and-forget.
 */
export function invalidateAllPermissionCache(): void {
  memoryCache.clear();

  const redis = getRedisClient();
  if (!redis) return;
  redis
    .keys(`${REDIS_KEY_PREFIX}*`)
    .then((keys) => (keys.length > 0 ? redis.del(...keys) : undefined))
    .catch((err: unknown) => {
      logger.warn({ err }, 'Redis permission-cache full invalidation failed');
    });
}
