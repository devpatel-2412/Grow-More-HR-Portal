import { prisma } from '../../db/prisma.js';
import type { Prisma, LeadStatus, ClientStatus, CrmActivityType } from '@prisma/client';

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

  /**
   * Converting a won lead creates its client and links the two in one transaction — a client
   * created without the back-link would let the same lead be converted twice.
   */
  convert(leadId: string, client: Prisma.ClientPortalCreateInput) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.clientPortal.create({ data: client });
      await tx.lead.update({ where: { id: leadId }, data: { convertedClientId: created.id, status: 'WON' } });
      return created;
    });
  }
}

export class ClientRepository {
  create(data: Prisma.ClientPortalCreateInput) {
    return prisma.clientPortal.create({ data });
  }

  findById(id: string) {
    return prisma.clientPortal.findUnique({ where: { id } });
  }

  findByEmail(tenantId: string, contactEmail: string) {
    return prisma.clientPortal.findUnique({ where: { tenantId_contactEmail: { tenantId, contactEmail } } });
  }

  findWithDetail(id: string) {
    return prisma.clientPortal.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
        projects: { select: { id: true, name: true, status: true } },
      },
    });
  }

  update(id: string, data: Prisma.ClientPortalUpdateInput) {
    return prisma.clientPortal.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.clientPortal.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: ClientStatus; accountManagerId?: string; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.ClientPortalWhereInput = {
      tenantId,
      status: filter.status,
      accountManagerId: filter.accountManagerId,
      OR: filter.search
        ? [
            { companyName: { contains: filter.search, mode: 'insensitive' } },
            { contactEmail: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.clientPortal.findMany({ where, orderBy, skip, take }),
      prisma.clientPortal.count({ where }),
    ]);
    return { rows, total };
  }
}

export class ContactRepository {
  create(data: Prisma.ClientContactCreateInput) {
    return prisma.clientContact.create({ data });
  }

  findById(id: string) {
    return prisma.clientContact.findUnique({ where: { id } });
  }

  delete(id: string) {
    return prisma.clientContact.delete({ where: { id } });
  }

  findByClientAndEmail(clientId: string, email: string) {
    return prisma.clientContact.findUnique({ where: { clientId_email: { clientId, email } } });
  }

  /** Demotes every other contact so "primary" stays singular per client. */
  setPrimary(clientId: string, contactId: string) {
    return prisma.$transaction([
      prisma.clientContact.updateMany({ where: { clientId, id: { not: contactId } }, data: { isPrimary: false } }),
      prisma.clientContact.update({ where: { id: contactId }, data: { isPrimary: true } }),
    ]);
  }
}

export class CrmActivityRepository {
  create(data: Prisma.CrmActivityCreateInput) {
    return prisma.crmActivity.create({ data });
  }

  async findMany(
    tenantId: string,
    filter: { leadId?: string; clientId?: string; type?: CrmActivityType },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.CrmActivityWhereInput = {
      tenantId,
      leadId: filter.leadId,
      clientId: filter.clientId,
      type: filter.type,
    };
    const [rows, total] = await Promise.all([
      prisma.crmActivity.findMany({ where, orderBy, skip, take }),
      prisma.crmActivity.count({ where }),
    ]);
    return { rows, total };
  }
}
