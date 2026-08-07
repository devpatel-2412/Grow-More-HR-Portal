/**
 * One-time (and safe to re-run) migration of the static UserRole → ROLE_PERMISSIONS map into the
 * dynamic RBAC tables: one `isSystem` Role per existing UserRole value, per tenant, pre-populated
 * with that role's current static permissions — so the Role Management UI has real, correct,
 * editable data from day one. Existing users are completely unaffected either way: the static map
 * keeps being consulted by permission-resolver.service.ts regardless of what's in these tables.
 *
 * Idempotent — running this again only fills in gaps (new tenants, or a system role that's
 * missing for some reason). It never touches a Role that already exists, so any permissions an
 * admin has since added to or removed from a system role are left alone.
 *
 * Run: npx tsx prisma/seed-rbac.ts
 */
import { PrismaClient, type UserRole } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../src/server/shared/permissions/permissions.js';

const prisma = new PrismaClient();

const SYSTEM_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Unrestricted access to every module and tenant-management action.',
  ADMIN: 'Full tenant administration — users, employees, all business modules, and role management.',
  HR_MANAGER: 'People operations — employees, attendance, leave, payroll, recruitment.',
  PROJECT_MANAGER: 'Projects, tasks, work reports, and team-facing modules.',
  EMPLOYEE: 'Self-service access — own profile, attendance, leave, tasks, payslips, documents.',
  CLIENT: 'External client-portal access — no internal-module visibility.',
  RECRUITER: 'Recruitment and applicant-tracking modules only.',
  FINANCE: 'Finance and billing modules only.',
  CANDIDATE: 'Reserved — no candidate-facing portal exists yet.',
};

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Seeding system roles for ${tenants.length} tenant(s)...`);

  for (const tenant of tenants) {
    for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
      const existing = await prisma.role.findFirst({ where: { tenantId: tenant.id, name: role } });
      if (existing) {
        console.log(`  [skip] ${tenant.name}: "${role}" already exists`);
        continue;
      }

      const permissions = ROLE_PERMISSIONS[role];
      const created = await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: role,
          description: SYSTEM_ROLE_DESCRIPTIONS[role],
          isSystem: true,
        },
      });
      if (permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId: created.id, permission })),
          skipDuplicates: true,
        });
      }
      console.log(`  [created] ${tenant.name}: "${role}" with ${permissions.length} permission(s)`);
    }
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
