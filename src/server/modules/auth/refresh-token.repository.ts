import { prisma } from '../../db/prisma.js';
import { randomUUID } from 'node:crypto';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  familyId?: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  rememberMe?: boolean;
}

export class RefreshTokenRepository {
  create(input: CreateRefreshTokenInput) {
    return prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        familyId: input.familyId ?? randomUUID(),
        deviceInfo: input.deviceInfo,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
        rememberMe: input.rememberMe ?? false,
      },
    });
  }

  findByTokenHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revoke(id: string, reason: string, replacedByTokenId?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason, replacedByTokenId },
    });
  }

  /** Revokes every non-revoked token sharing a family id — the OWASP-recommended response to detected refresh-token reuse (theft). */
  async revokeFamily(familyId: string, reason: string) {
    return prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async revokeAllForUser(userId: string, reason: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  /** Every currently-live session across the tenant, newest activity first — the data behind the
   * session management dashboard. A "session" here is one un-revoked, un-expired refresh token.
   * The dashboard has no pagination UI, so this stays a single unpaginated fetch (unchanged
   * behavior for any realistic tenant) — the `take` is only a safety ceiling against a pathological
   * tenant with an unbounded number of stale-but-not-yet-expired sessions, not a page size. */
  findActiveByTenant(tenantId: string) {
    return prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() }, user: { tenantId } },
      include: {
        user: { select: { id: true, email: true, role: true, avatarStorageKey: true, profile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { lastUsedAt: 'desc' },
      take: 500,
    });
  }

  /** Every currently-live session for one user — used both for "my active sessions" (self-service)
   * and as the target set for a per-user force logout. */
  findActiveByUser(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  findById(id: string) {
    return prisma.refreshToken.findUnique({ where: { id } });
  }
}
