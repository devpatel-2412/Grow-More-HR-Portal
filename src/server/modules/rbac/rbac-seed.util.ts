import { RbacRepository } from './rbac.repository.js';
import { ROLE_PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { UserRole } from '@prisma/client';

/**
 * The 5 non-SUPER_ADMIN fixed roles — SUPER_ADMIN never gets a Role row (its access is hardcoded,
 * never DB-driven; see permission-resolver.service.ts).
 */
const SEEDED_ROLES = Object.keys(ROLE_PERMISSIONS).filter((role) => role !== 'SUPER_ADMIN') as Exclude<UserRole, 'SUPER_ADMIN'>[];

export const SYSTEM_ROLE_DESCRIPTIONS: Record<Exclude<UserRole, 'SUPER_ADMIN'>, string> = {
  ADMIN: 'Full tenant administration — users, employees, and all business modules.',
  HR_MANAGER: 'People operations — employees, attendance, leave, payroll, recruitment.',
  PROJECT_MANAGER: 'Projects, tasks, work reports, and team-facing modules.',
  TEAM_LEADER: 'Leads a team day-to-day — task assignment, attendance/leave approval for direct reports.',
  EMPLOYEE: 'Self-service access — own profile, attendance, leave, tasks, payslips, documents.',
};

/**
 * Idempotent — only fills gaps, never touches a Role that already exists, so any permissions a
 * SUPER_ADMIN has since added or removed via the Roles & Permissions page are left alone. Seeds
 * each of the 5 fixed roles' starting permission set from ROLE_PERMISSIONS (see that file's doc
 * comment — after seeding, the DB row is what's actually consulted, not this static array).
 *
 * Called from two places: prisma/seed-rbac.ts (a one-off/backfill CLI script) and
 * TenantService.create() (so a brand new company has real, editable rows from day one instead of
 * running on the static fallback indefinitely).
 */
export async function seedSystemRolesForTenant(
  tenantId: string,
  repository: RbacRepository = new RbacRepository(),
): Promise<{ created: UserRole[]; skipped: UserRole[] }> {
  const created: UserRole[] = [];
  const skipped: UserRole[] = [];

  for (const role of SEEDED_ROLES) {
    const existing = await repository.findRoleByName(tenantId, role);
    if (existing) {
      skipped.push(role);
      continue;
    }

    const permissions = ROLE_PERMISSIONS[role];
    const row = await repository.createRole({
      tenantId,
      name: role,
      description: SYSTEM_ROLE_DESCRIPTIONS[role],
      isSystem: true,
    });
    if (permissions.length > 0) {
      await repository.addRolePermissions(row.id, permissions);
    }
    created.push(role);
  }

  return { created, skipped };
}
