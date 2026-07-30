import { prisma } from '../../db/prisma.js';
import type { Prisma, LeaveStatus, LeaveType } from '@prisma/client';

const ACTIVE_STATUSES: LeaveStatus[] = ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED'];

export interface LeaveFilter {
  employeeId?: string;
  managerId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  from?: Date;
  to?: Date;
}

export class LeaveRepository {
  create(data: Prisma.LeaveRequestCreateInput) {
    return prisma.leaveRequest.create({ data });
  }

  findById(id: string) {
    return prisma.leaveRequest.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.LeaveRequestUpdateInput) {
    return prisma.leaveRequest.update({ where: { id }, data });
  }

  /** Any existing active (not rejected/cancelled) request for the employee whose date range overlaps the given range. */
  findOverlapping(employeeId: string, startDate: Date, endDate: Date) {
    return prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ACTIVE_STATUSES },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  async findMany(tenantId: string, filter: LeaveFilter, skip: number, take: number) {
    const where: Prisma.LeaveRequestWhereInput = {
      tenantId,
      employeeId: filter.employeeId,
      managerId: filter.managerId,
      status: filter.status,
      leaveType: filter.leaveType,
      startDate: filter.from ? { gte: filter.from } : undefined,
      endDate: filter.to ? { lte: filter.to } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.leaveRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.leaveRequest.count({ where }),
    ]);
    return { rows, total };
  }
}
