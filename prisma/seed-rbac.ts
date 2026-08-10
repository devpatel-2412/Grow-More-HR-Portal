/**
 * One-off/backfill CLI for prisma/seed-rbac.ts's underlying logic — seeds each tenant's 5 fixed
 * system roles (see rbac-seed.util.ts) if they don't already exist. Every new tenant gets this
 * automatically at creation time (TenantService.create()); this script exists for tenants created
 * before that was wired in, or to re-run after a manual fix.
 *
 * Idempotent — safe to run repeatedly. Never touches a Role that already exists.
 *
 * Run: npx tsx prisma/seed-rbac.ts
 */
import { prisma } from '../src/server/db/prisma.js';
import { seedSystemRolesForTenant } from '../src/server/modules/rbac/rbac-seed.util.js';
import { RbacRepository } from '../src/server/modules/rbac/rbac.repository.js';

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Seeding system roles for ${tenants.length} tenant(s)...`);

  const repository = new RbacRepository();
  for (const tenant of tenants) {
    const { created, skipped } = await seedSystemRolesForTenant(tenant.id, repository);
    for (const role of skipped) console.log(`  [skip] ${tenant.name}: "${role}" already exists`);
    for (const role of created) console.log(`  [created] ${tenant.name}: "${role}"`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
