import { prisma } from '../../db/prisma.js';
import type { Prisma, TaskStatus, TaskPriority } from '@prisma/client';

export interface TaskFilter {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
}

export class TaskRepository {
  create(data: Prisma.TaskCreateInput) {
    return prisma.task.create({ data, include: { subtasks: true } });
  }

  findById(id: string) {
    return prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
  }

  update(id: string, data: Prisma.TaskUpdateInput) {
    return prisma.task.update({ where: { id }, data, include: { subtasks: true } });
  }

  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: TaskFilter,
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.TaskWhereInput = {
      tenantId,
      projectId: filter.projectId,
      status: filter.status,
      priority: filter.priority,
      assignedToId: filter.assignedToId,
    };
    const [rows, total] = await Promise.all([
      prisma.task.findMany({ where, orderBy, skip, take }),
      prisma.task.count({ where }),
    ]);
    return { rows, total };
  }
}
