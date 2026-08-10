import { prisma } from '../../db/prisma.js';
import type { Prisma, ProjectStatus } from '@prisma/client';

export class ProjectRepository {
  create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data });
  }

  findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: ProjectStatus; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.ProjectWhereInput = {
      tenantId,
      status: filter.status,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.project.findMany({ where, orderBy, skip, take }),
      prisma.project.count({ where }),
    ]);
    return { rows, total };
  }
}
