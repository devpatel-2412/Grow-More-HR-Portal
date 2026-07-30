import { prisma } from '../../db/prisma.js';
import type { Prisma, WorkReportStatus } from '@prisma/client';

export interface WorkReportFilter {
  employeeId?: string;
  employeeIds?: string[];
  status?: WorkReportStatus;
  from?: Date;
  to?: Date;
}

export class WorkReportRepository {
  create(data: Prisma.DailyWorkReportCreateInput) {
    return prisma.dailyWorkReport.create({ data });
  }

  findById(id: string) {
    return prisma.dailyWorkReport.findUnique({ where: { id } });
  }

  findByEmployeeAndDate(employeeId: string, date: Date) {
    return prisma.dailyWorkReport.findUnique({ where: { employeeId_date: { employeeId, date } } });
  }

  update(id: string, data: Prisma.DailyWorkReportUpdateInput) {
    return prisma.dailyWorkReport.update({ where: { id }, data });
  }

  async findMany(tenantId: string, filter: WorkReportFilter, skip: number, take: number) {
    const where: Prisma.DailyWorkReportWhereInput = {
      tenantId,
      employeeId: filter.employeeIds ? { in: filter.employeeIds } : filter.employeeId,
      status: filter.status,
      date: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.dailyWorkReport.findMany({ where, orderBy: { date: 'desc' }, skip, take }),
      prisma.dailyWorkReport.count({ where }),
    ]);
    return { rows, total };
  }
}
