import { prisma } from '../../db/prisma.js';
import type { UserRole } from '@prisma/client';

export class InviteRepository {
  create(data: { tenantId: string; email: string; role: UserRole; tokenHash: string; invitedById?: string; expiresAt: Date }) {
    return prisma.invite.create({ data });
  }

  findByTokenHash(tokenHash: string) {
    return prisma.invite.findUnique({ where: { tokenHash } });
  }

  findPendingByTenantAndEmail(tenantId: string, email: string) {
    return prisma.invite.findFirst({ where: { tenantId, email: email.toLowerCase(), status: 'PENDING' } });
  }

  markAccepted(id: string) {
    return prisma.invite.update({ where: { id }, data: { status: 'ACCEPTED' } });
  }
}
