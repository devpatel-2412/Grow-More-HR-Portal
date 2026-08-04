import { prisma } from '../../db/prisma.js';
import type { Prisma, SopStatus } from '@prisma/client';

export class SopRepository {
  create(data: Prisma.SopCreateInput) {
    return prisma.sop.create({ data });
  }

  findById(id: string) {
    return prisma.sop.findUnique({ where: { id } });
  }

  findByTitle(tenantId: string, title: string) {
    return prisma.sop.findUnique({ where: { tenantId_title: { tenantId, title } } });
  }

  update(id: string, data: Prisma.SopUpdateInput) {
    return prisma.sop.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.sop.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: SopStatus; category?: string; department?: string; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.SopWhereInput = {
      tenantId,
      status: filter.status,
      category: filter.category,
      department: filter.department,
      OR: filter.search
        ? [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { body: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.sop.findMany({ where, orderBy, skip, take }),
      prisma.sop.count({ where }),
    ]);
    return { rows, total };
  }

  /** Snapshots the pre-overwrite body as a revision, then applies the new body and version in one transaction. */
  reviseAndUpdate(
    sopId: string,
    tenantId: string,
    currentVersion: number,
    currentBody: string,
    newBody: string,
    changedById: string | undefined,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.sopRevision.create({
        data: {
          tenant: { connect: { id: tenantId } },
          sop: { connect: { id: sopId } },
          version: currentVersion,
          body: currentBody,
          changedBy: changedById ? { connect: { id: changedById } } : undefined,
        },
      });
      return tx.sop.update({ where: { id: sopId }, data: { body: newBody, version: { increment: 1 } } });
    });
  }

  findRevisions(sopId: string) {
    return prisma.sopRevision.findMany({ where: { sopId }, orderBy: { version: 'desc' } });
  }
}
