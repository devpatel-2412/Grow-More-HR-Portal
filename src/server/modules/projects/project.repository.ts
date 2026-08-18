import { prisma } from '../../db/prisma.js';
import type { Prisma, ProjectStatus } from '@prisma/client';

export interface ProjectTaskSummary {
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  members: { id: string; firstName: string; lastName: string }[];
  myOpenTasks: number;
}

export class ProjectRepository {
  create(data: Prisma.ProjectCreateInput) {
    return prisma.project.create({ data });
  }

  findById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  }

  /** Same lookup, but only matches when `employeeId` has at least one task in the project — the
   * backing check for non-project:manage viewers (see ProjectService.getById). */
  findByIdForEmployee(id: string, tenantId: string, employeeId: string) {
    return prisma.project.findFirst({ where: { id, tenantId, tasks: { some: { assignedToId: employeeId } } } });
  }

  update(id: string, data: Prisma.ProjectUpdateInput) {
    return prisma.project.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: ProjectStatus; search?: string; assignedEmployeeId?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.ProjectWhereInput = {
      tenantId,
      status: filter.status,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
      tasks: filter.assignedEmployeeId ? { some: { assignedToId: filter.assignedEmployeeId } } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.project.findMany({ where, orderBy, skip, take }),
      prisma.project.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * Task-derived stats for a batch of projects — computed live from real Task rows (no schema
   * change, no fabricated data). `viewerEmployeeId`, when given, also splits out how many of the
   * viewer's own open tasks fall in each project.
   */
  async getTaskSummaries(projectIds: string[], viewerEmployeeId?: string | null): Promise<Map<string, ProjectTaskSummary>> {
    const summaries = new Map<string, ProjectTaskSummary>();
    if (projectIds.length === 0) return summaries;
    for (const id of projectIds) summaries.set(id, { totalTasks: 0, openTasks: 0, completedTasks: 0, members: [], myOpenTasks: 0 });

    const [statusCounts, assigneeRows, myOpenCounts] = await Promise.all([
      prisma.task.groupBy({ by: ['projectId', 'status'], where: { projectId: { in: projectIds } }, _count: { _all: true } }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, assignedToId: { not: null } },
        distinct: ['projectId', 'assignedToId'],
        select: { projectId: true, assignedTo: { select: { id: true, firstName: true, lastName: true } } },
      }),
      viewerEmployeeId
        ? prisma.task.groupBy({
            by: ['projectId'],
            where: { projectId: { in: projectIds }, assignedToId: viewerEmployeeId, status: { not: 'DONE' } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    for (const row of statusCounts) {
      const summary = summaries.get(row.projectId);
      if (!summary) continue;
      summary.totalTasks += row._count._all;
      if (row.status === 'DONE') summary.completedTasks += row._count._all;
      else summary.openTasks += row._count._all;
    }

    for (const row of assigneeRows) {
      if (!row.assignedTo) continue;
      summaries.get(row.projectId)?.members.push(row.assignedTo);
    }

    for (const row of myOpenCounts) {
      const summary = summaries.get(row.projectId);
      if (summary) summary.myOpenTasks = row._count._all;
    }

    return summaries;
  }
}
