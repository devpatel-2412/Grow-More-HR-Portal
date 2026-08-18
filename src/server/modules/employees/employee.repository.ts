import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

// The profile picture lives on User (see avatar-url.util.ts's comment for why), so every read
// that returns an EmployeeProfile to the client needs this join to surface it — resolved into a
// signed avatarUrl and stripped back out of the raw `user` sub-object in employee.controller.ts.
const AVATAR_INCLUDE = { user: { select: { avatarStorageKey: true } } } as const;

export class EmployeeRepository {
  create(data: Prisma.EmployeeProfileCreateInput) {
    return prisma.employeeProfile.create({ data, include: AVATAR_INCLUDE });
  }

  findById(id: string) {
    return prisma.employeeProfile.findUnique({ where: { id }, include: AVATAR_INCLUDE });
  }

  findByUserId(userId: string) {
    return prisma.employeeProfile.findUnique({ where: { userId }, include: AVATAR_INCLUDE });
  }

  findByTenantAndEmployeeId(tenantId: string, employeeId: string) {
    return prisma.employeeProfile.findUnique({ where: { tenantId_employeeId: { tenantId, employeeId } } });
  }

  update(id: string, data: Prisma.EmployeeProfileUpdateInput) {
    return prisma.employeeProfile.update({ where: { id }, data, include: AVATAR_INCLUDE });
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
      prisma.employeeProfile.findMany({ where, orderBy, skip, take, include: AVATAR_INCLUDE }),
      prisma.employeeProfile.count({ where }),
    ]);
    return { rows, total };
  }
}
