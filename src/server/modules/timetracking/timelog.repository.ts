import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export interface TimeLogFilter {
  employeeId?: string;
  taskId?: string;
  from?: Date;
  to?: Date;
}

function buildWhere(tenantId: string, filter: TimeLogFilter): Prisma.TimeLogWhereInput {
  return {
    tenantId,
    employeeId: filter.employeeId,
    taskId: filter.taskId,
    startedAt: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
  };
}

export class TimeLogRepository {
  create(data: Prisma.TimeLogCreateInput) {
    return prisma.timeLog.create({ data });
  }

  findById(id: string) {
    return prisma.timeLog.findUnique({ where: { id } });
  }

  /** The employee's currently-running timer, if any — `endedAt: null` is the "running" marker. */
  findRunning(employeeId: string) {
    return prisma.timeLog.findFirst({ where: { employeeId, endedAt: null } });
  }

  async findMany(tenantId: string, filter: TimeLogFilter, skip: number, take: number) {
    const where = buildWhere(tenantId, filter);
    const [rows, total] = await Promise.all([
      prisma.timeLog.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take }),
      prisma.timeLog.count({ where }),
    ]);
    return { rows, total };
  }

  async sumMinutes(tenantId: string, filter: TimeLogFilter) {
    const result = await prisma.timeLog.aggregate({
      where: buildWhere(tenantId, filter),
      _sum: { durationMinutes: true },
      _count: true,
    });
    return { totalMinutes: result._sum.durationMinutes ?? 0, entryCount: result._count };
  }

  /**
   * Closing a log and rolling its minutes into Task.loggedHours must be atomic — a partial write
   * would leave the task's total permanently out of step with its logs.
   */
  closeAndRollUp(id: string, endedAt: Date, durationMinutes: number, taskId: string | null, description?: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.timeLog.update({
        where: { id },
        data: { endedAt, durationMinutes, description },
      });
      if (taskId) {
        await tx.task.update({
          where: { id: taskId },
          data: { loggedHours: { increment: durationMinutes / 60 } },
        });
      }
      return updated;
    });
  }

  createAndRollUp(data: Prisma.TimeLogCreateInput, taskId: string | null, durationMinutes: number) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.timeLog.create({ data });
      if (taskId) {
        await tx.task.update({
          where: { id: taskId },
          data: { loggedHours: { increment: durationMinutes / 60 } },
        });
      }
      return created;
    });
  }

  deleteAndRollBack(id: string, taskId: string | null, durationMinutes: number) {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.timeLog.delete({ where: { id } });
      if (taskId && durationMinutes > 0) {
        await tx.task.update({
          where: { id: taskId },
          data: { loggedHours: { decrement: durationMinutes / 60 } },
        });
      }
      return deleted;
    });
  }
}
