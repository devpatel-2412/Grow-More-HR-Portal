import { prisma } from '../db/prisma.js';
import { hashPassword } from '../shared/utils/hash.util.js';
import { env } from '../shared/config/env.js';
import { logger } from '../shared/logger.js';
import { auditLogService } from '../modules/audit/audit.service.js';

const PLATFORM_TENANT_DOMAIN = 'platform-administration';

/**
 * Public registration is permanently closed (see auth.routes.ts) — every user is provisioned
 * internally by someone already authorized. That has a bootstrapping problem: the very first
 * account. Resolved here, on every boot, by reconciling exactly one account —
 * BOOTSTRAP_SUPER_ADMIN_EMAIL — against whatever currently exists in the database:
 *
 *   - No user with that email, and no SUPER_ADMIN anywhere → create it fresh.
 *   - No user with that email, but a SUPER_ADMIN already exists under a different email →
 *     leave it alone (creating one here would be a second, redundant SUPER_ADMIN).
 *   - A user with that email exists but isn't SUPER_ADMIN → promote it in place. This is the
 *     collision case that otherwise strands the configured account forever: if
 *     BOOTSTRAP_SUPER_ADMIN_EMAIL happens to match an account created some other way (an invite,
 *     an earlier partial bootstrap attempt with different values, ...), silently skipping (the
 *     original behavior) means the configured credentials can never actually log in.
 *   - A user with that email is already SUPER_ADMIN → self-heal: force ACTIVE, clear any login
 *     lockout, and reset the password hash to match the currently configured
 *     BOOTSTRAP_SUPER_ADMIN_PASSWORD, so a stale password or an accidental suspend can never
 *     permanently strand the one account guaranteed to be able to log in.
 *
 * Every branch is idempotent — running this on every boot is intentional and safe. Never crashes
 * server startup: an admin can always be fixed manually via direct DB access if this fails for
 * some environment-specific reason. Called once from server.ts, before startScheduledJobs().
 */
export async function bootstrapSuperAdmin(): Promise<void> {
  if (!env.BOOTSTRAP_SUPER_ADMIN_EMAIL || !env.BOOTSTRAP_SUPER_ADMIN_PASSWORD) {
    logger.warn(
      'BOOTSTRAP_SUPER_ADMIN_EMAIL/BOOTSTRAP_SUPER_ADMIN_PASSWORD are not set — the application ' +
        'has no way to provision a login unless a SUPER_ADMIN already exists. Set both env vars and redeploy.',
    );
    return;
  }

  const email = env.BOOTSTRAP_SUPER_ADMIN_EMAIL.toLowerCase();

  try {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });

    if (existingByEmail?.role === 'SUPER_ADMIN') {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            status: 'ACTIVE',
            passwordHash: hashPassword(env.BOOTSTRAP_SUPER_ADMIN_PASSWORD),
            failedLoginCount: 0,
            lockedUntil: null,
          },
        });
      });
      await auditLogService.record({
        tenantId: existingByEmail.tenantId,
        actorUserId: existingByEmail.id,
        action: 'SUPER_ADMIN_BOOTSTRAPPED',
        targetType: 'User',
        targetId: existingByEmail.id,
        metadata: { outcome: 'verified' },
      });
      logger.info({ email }, 'Verified bootstrap SUPER_ADMIN account');
      return;
    }

    if (existingByEmail) {
      // Its existing tenantId needs no extra validation before reuse: `tenantId` is a required,
      // cascading foreign key, so an existing User row can never point at a nonexistent Tenant.
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            passwordHash: hashPassword(env.BOOTSTRAP_SUPER_ADMIN_PASSWORD),
            failedLoginCount: 0,
            lockedUntil: null,
          },
        });
      });
      await auditLogService.record({
        tenantId: existingByEmail.tenantId,
        actorUserId: existingByEmail.id,
        action: 'SUPER_ADMIN_BOOTSTRAPPED',
        targetType: 'User',
        targetId: existingByEmail.id,
        metadata: { outcome: 'promoted', previousRole: existingByEmail.role },
      });
      logger.info({ email }, 'Promoted existing bootstrap account to SUPER_ADMIN');
      return;
    }

    const existingSuperAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (existingSuperAdminCount > 0) {
      logger.info({ email }, 'A SUPER_ADMIN already exists under a different email — skipping bootstrap creation');
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
      metadata: { outcome: 'created' },
    });

    logger.info({ email }, 'Bootstrapped the first SUPER_ADMIN account from environment variables');
  } catch (err) {
    // Never crash server startup over this — an admin can always be fixed manually via direct DB
    // access if the automatic bootstrap fails for some environment-specific reason.
    logger.error({ err }, 'Failed to bootstrap the first SUPER_ADMIN account');
  }
}
