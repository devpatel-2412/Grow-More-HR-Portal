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
}
