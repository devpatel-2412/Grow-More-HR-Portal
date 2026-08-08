import { prisma } from '../../db/prisma.js';
import type { UserRole } from '@prisma/client';

export class InviteRepository {
  create(data: { tenantId: string; email: string; role: UserRole; tokenHash: string; invitedById?: string; expiresAt: Date }) {
    return prisma.invite.create({ data });
  }

  findByTokenHash(tokenHash: string) {
    return prisma.invite.findUnique({ where: { tokenHash } });
  }

  findById(id: string) {
    return prisma.invite.findUnique({ where: { id } });
  }

  findPendingByTenantAndEmail(tenantId: string, email: string) {
    return prisma.invite.findFirst({ where: { tenantId, email: email.toLowerCase(), status: 'PENDING' } });
  }

  async findManyByTenant(tenantId: string, skip: number, take: number) {
    const [rows, total] = await Promise.all([
      prisma.invite.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.invite.count({ where: { tenantId } }),
    ]);
    return { rows, total };
  }

  markAccepted(id: string) {
    return prisma.invite.update({ where: { id }, data: { status: 'ACCEPTED' } });
  }

  markRevoked(id: string) {
    return prisma.invite.update({ where: { id }, data: { status: 'REVOKED' } });
  }

  /** Resend = a fresh token and a reset expiry, so an old leaked/expired link stops working the moment a new one is issued. */
  updateToken(id: string, tokenHash: string, expiresAt: Date) {
    return prisma.invite.update({ where: { id }, data: { tokenHash, expiresAt } });
  }
}
