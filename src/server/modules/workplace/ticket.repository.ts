import { prisma } from '../../db/prisma.js';
import type { Prisma, TicketCategory, TicketStatus } from '@prisma/client';

export class TicketRepository {
  create(data: Prisma.TicketCreateInput) {
    return prisma.ticket.create({ data });
  }

  findById(id: string) {
    return prisma.ticket.findUnique({ where: { id } });
  }

  findWithComments(id: string) {
    return prisma.ticket.findUnique({ where: { id }, include: { comments: { orderBy: { createdAt: 'asc' } } } });
  }

  update(id: string, data: Prisma.TicketUpdateInput) {
    return prisma.ticket.update({ where: { id }, data });
  }

  async findMany(
    tenantId: string,
    filter: {
      status?: TicketStatus;
      category?: TicketCategory;
      assignedToId?: string;
      employeeId?: string;
      /** Restricts to tickets where the caller is either the reporter or the assignee — used when the caller lacks tenant-wide read. */
      ownedByEmployeeId?: string;
    },
    skip: number,
    take: number,
  ) {
    const where: Prisma.TicketWhereInput = {
      tenantId,
      status: filter.status,
      category: filter.category,
      assignedToId: filter.assignedToId,
      employeeId: filter.employeeId,
      ...(filter.ownedByEmployeeId
        ? { OR: [{ employeeId: filter.ownedByEmployeeId }, { assignedToId: filter.ownedByEmployeeId }] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.ticket.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.ticket.count({ where }),
    ]);
    return { rows, total };
  }
}

export class TicketCommentRepository {
  create(data: Prisma.TicketCommentCreateInput) {
    return prisma.ticketComment.create({ data });
  }
}
