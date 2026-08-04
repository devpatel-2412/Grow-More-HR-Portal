import { prisma } from '../../db/prisma.js';
import type { Prisma, RegularizationStatus } from '@prisma/client';

export class RegularizationRepository {
  create(data: Prisma.AttendanceRegularizationCreateInput) {
    return prisma.attendanceRegularization.create({ data });
  }

  findById(id: string) {
    return prisma.attendanceRegularization.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.AttendanceRegularizationUpdateInput) {
    return prisma.attendanceRegularization.update({ where: { id }, data });
  }

  async findMany(
    tenantId: string,
    filter: { employeeId?: string; status?: RegularizationStatus },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.AttendanceRegularizationWhereInput = {
      tenantId,
      employeeId: filter.employeeId,
      status: filter.status,
    };
    const [rows, total] = await Promise.all([
      prisma.attendanceRegularization.findMany({ where, orderBy, skip, take }),
      prisma.attendanceRegularization.count({ where }),
    ]);
    return { rows, total };
  }
}
