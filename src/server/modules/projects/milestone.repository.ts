import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class MilestoneRepository {
  create(data: Prisma.MilestoneCreateInput) {
    return prisma.milestone.create({ data });
  }

  findById(id: string) {
    return prisma.milestone.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.MilestoneUpdateInput) {
    return prisma.milestone.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.milestone.delete({ where: { id } });
  }

  findByProject(projectId: string) {
    return prisma.milestone.findMany({ where: { projectId }, orderBy: { dueDate: 'asc' } });
  }
}
