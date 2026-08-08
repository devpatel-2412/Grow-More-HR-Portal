import { prisma } from '../db/prisma.js';
import { hashPassword } from '../shared/utils/hash.util.js';
import { env } from '../shared/config/env.js';
import { logger } from '../shared/logger.js';
import { auditLogService } from '../modules/audit/audit.service.js';

const PLATFORM_TENANT_DOMAIN = 'platform-administration';

/**
 * Public registration is permanently closed (see auth.routes.ts) — every user is provisioned
 * internally by someone already authorized. That has a bootstrapping problem: the very first
 * account. Resolved here by creating exactly one SUPER_ADMIN from Render env vars on boot, but
 * only when none exists yet. Idempotent by design (`count === 0` guard), so it's safe to leave
 * BOOTSTRAP_SUPER_ADMIN_EMAIL/PASSWORD set in Render indefinitely — every later boot is a no-op.
 * Called once from server.ts, before startScheduledJobs().
 */
export async function bootstrapSuperAdmin(): Promise<void> {
  const existingCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
  if (existingCount > 0) return;

  if (!env.BOOTSTRAP_SUPER_ADMIN_EMAIL || !env.BOOTSTRAP_SUPER_ADMIN_PASSWORD) {
    logger.warn(
      'No SUPER_ADMIN account exists and BOOTSTRAP_SUPER_ADMIN_EMAIL/BOOTSTRAP_SUPER_ADMIN_PASSWORD are not set — ' +
        'the application has no way for anyone to log in. Set both env vars and redeploy.',
    );
    return;
  }

  const email = env.BOOTSTRAP_SUPER_ADMIN_EMAIL.toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn(
        { email },
        'BOOTSTRAP_SUPER_ADMIN_EMAIL matches an existing account that is not a SUPER_ADMIN — skipping bootstrap. ' +
          'Promote that user manually or change the email/redeploy.',
      );
      return;
    }

    const { tenant, user } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { domain: PLATFORM_TENANT_DOMAIN },
        update: {},
        create: { name: 'Platform Administration', domain: PLATFORM_TENANT_DOMAIN },
      });
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashPassword(env.BOOTSTRAP_SUPER_ADMIN_PASSWORD),
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          tenantId: tenant.id,
        },
      });
      return { tenant, user };
    });

    await auditLogService.record({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'SUPER_ADMIN_BOOTSTRAPPED',
      targetType: 'User',
      targetId: user.id,
    });

    logger.info({ email }, 'Bootstrapped the first SUPER_ADMIN account from environment variables');
  } catch (err) {
    // Never crash server startup over this — an admin can always be promoted manually via
    // direct DB access if the automatic bootstrap fails for some environment-specific reason.
    logger.error({ err }, 'Failed to bootstrap the first SUPER_ADMIN account');
  }
}
