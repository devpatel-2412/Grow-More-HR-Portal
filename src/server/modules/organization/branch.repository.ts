import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class BranchRepository {
  create(data: Prisma.BranchCreateInput) {
    return prisma.branch.create({ data });
  }

  findById(id: string) {
    return prisma.branch.findUnique({ where: { id } });
  }

  findByCode(tenantId: string, code: string) {
    return prisma.branch.findUnique({ where: { tenantId_code: { tenantId, code } } });
  }

  update(id: string, data: Prisma.BranchUpdateInput) {
    return prisma.branch.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.branch.delete({ where: { id } });
  }

  countEmployees(id: string) {
    return prisma.employeeProfile.count({ where: { branchId: id } });
  }

  countTeams(id: string) {
    return prisma.team.count({ where: { branchId: id } });
  }

  async findMany(
    tenantId: string,
    filter: { search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.BranchWhereInput = {
      tenantId,
      OR: filter.search
        ? [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { code: { contains: filter.search, mode: 'insensitive' } },
            { city: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.branch.findMany({ where, orderBy, skip, take }),
      prisma.branch.count({ where }),
    ]);
    return { rows, total };
  }
}
