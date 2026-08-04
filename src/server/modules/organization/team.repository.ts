import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class TeamRepository {
  create(data: Prisma.TeamCreateInput) {
    return prisma.team.create({ data });
  }

  findById(id: string) {
    return prisma.team.findUnique({ where: { id } });
  }

  findByName(tenantId: string, name: string) {
    return prisma.team.findUnique({ where: { tenantId_name: { tenantId, name } } });
  }

  update(id: string, data: Prisma.TeamUpdateInput) {
    return prisma.team.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.team.delete({ where: { id } });
  }

  countMembers(id: string) {
    return prisma.employeeProfile.count({ where: { teamId: id } });
  }

  async findMany(
    tenantId: string,
    filter: { branchId?: string; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.TeamWhereInput = {
      tenantId,
      branchId: filter.branchId,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.team.findMany({ where, orderBy, skip, take }),
      prisma.team.count({ where }),
    ]);
    return { rows, total };
  }
}
