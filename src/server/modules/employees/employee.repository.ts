import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class EmployeeRepository {
  create(data: Prisma.EmployeeProfileCreateInput) {
    return prisma.employeeProfile.create({ data });
  }

  findById(id: string) {
    return prisma.employeeProfile.findUnique({ where: { id } });
  }

  findByUserId(userId: string) {
    return prisma.employeeProfile.findUnique({ where: { userId } });
  }

  update(id: string, data: Prisma.EmployeeProfileUpdateInput) {
    return prisma.employeeProfile.update({ where: { id }, data });
  }

  async findManyByTenant(
    tenantId: string,
    filter: { department?: string; status?: string; managerId?: string; branchId?: string; teamId?: string; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.EmployeeProfileWhereInput = {
      tenantId,
      department: filter.department,
      managerId: filter.managerId,
      branchId: filter.branchId,
      teamId: filter.teamId,
      status: filter.status as Prisma.EnumEmployeeStatusFilter['equals'],
      OR: filter.search
        ? [
            { firstName: { contains: filter.search, mode: 'insensitive' } },
            { lastName: { contains: filter.search, mode: 'insensitive' } },
            { employeeId: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.employeeProfile.findMany({ where, orderBy, skip, take }),
      prisma.employeeProfile.count({ where }),
    ]);
    return { rows, total };
  }
}
