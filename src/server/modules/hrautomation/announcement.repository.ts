import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class AnnouncementRepository {
  create(data: Prisma.AnnouncementCreateInput) {
    return prisma.announcement.create({ data });
  }

  findById(id: string) {
    return prisma.announcement.findUnique({ where: { id } });
  }

  delete(id: string) {
    return prisma.announcement.delete({ where: { id } });
  }

  /**
   * Visible set for one employee: every ALL-audience announcement, plus DEPARTMENT-scoped ones
   * matching their own department. Expired announcements (past `expiresAt`) are excluded.
   */
  async findVisible(tenantId: string, department: string | undefined, skip: number, take: number) {
    const where: Prisma.AnnouncementWhereInput = {
      tenantId,
      AND: [
        { OR: [{ audience: 'ALL' }, ...(department ? [{ audience: 'DEPARTMENT' as const, department }] : [])] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      ],
    };
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.announcement.count({ where }),
    ]);
    return { rows, total };
  }
}
