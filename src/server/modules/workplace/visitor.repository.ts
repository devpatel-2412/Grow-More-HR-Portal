import { prisma } from '../../db/prisma.js';
import type { Prisma, VisitorStatus } from '@prisma/client';

export class VisitorRepository {
  create(data: Prisma.VisitorCreateInput) {
    return prisma.visitor.create({ data });
  }

  findById(id: string) {
    return prisma.visitor.findUnique({ where: { id } });
  }

  findByPassCode(qrPassCode: string) {
    return prisma.visitor.findUnique({ where: { qrPassCode } });
  }

  update(id: string, data: Prisma.VisitorUpdateInput) {
    return prisma.visitor.update({ where: { id }, data });
  }

  async findMany(
    tenantId: string,
    filter: { status?: VisitorStatus; hostEmployeeId?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.VisitorWhereInput = { tenantId, status: filter.status, hostEmployeeId: filter.hostEmployeeId };
    const [rows, total] = await Promise.all([
      prisma.visitor.findMany({ where, orderBy, skip, take }),
      prisma.visitor.count({ where }),
    ]);
    return { rows, total };
  }
}
