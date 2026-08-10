import { prisma } from '../../db/prisma.js';
import type { Prisma, LeadStatus, CrmActivityType } from '@prisma/client';

export class LeadRepository {
  create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data });
  }

  findById(id: string) {
    return prisma.lead.findUnique({ where: { id } });
  }

  findByEmail(tenantId: string, email: string) {
    return prisma.lead.findUnique({ where: { tenantId_email: { tenantId, email } } });
  }

  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: LeadStatus; ownerId?: string; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.LeadWhereInput = {
      tenantId,
      status: filter.status,
      ownerId: filter.ownerId,
      OR: filter.search
        ? [
            { companyName: { contains: filter.search, mode: 'insensitive' } },
            { contactName: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.lead.findMany({ where, orderBy, skip, take }),
      prisma.lead.count({ where }),
    ]);
    return { rows, total };
  }

  /** Pipeline value and count per stage — the headline numbers on the CRM dashboard. */
  async summarise(tenantId: string) {
    const grouped = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      _sum: { estimatedValue: true },
    });
    return grouped.map((row) => ({
      status: row.status,
      count: row._count,
      value: row._sum.estimatedValue ?? 0,
    }));
  }
}

export class CrmActivityRepository {
  create(data: Prisma.CrmActivityCreateInput) {
    return prisma.crmActivity.create({ data });
  }

  async findMany(
    tenantId: string,
    filter: { leadId?: string; type?: CrmActivityType },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.CrmActivityWhereInput = {
      tenantId,
      leadId: filter.leadId,
      type: filter.type,
    };
    const [rows, total] = await Promise.all([
      prisma.crmActivity.findMany({ where, orderBy, skip, take }),
      prisma.crmActivity.count({ where }),
    ]);
    return { rows, total };
  }
}
