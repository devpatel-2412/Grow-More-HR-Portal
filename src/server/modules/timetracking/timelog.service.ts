import { TimeLogRepository, type TimeLogFilter } from './timelog.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { TaskRepository } from '../tasks/task.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const TIMELOG_SORTABLE_FIELDS = ['startedAt', 'endedAt', 'durationMinutes', 'source'] as const;
import type { z } from 'zod';
import type { startTimerSchema, manualTimeLogSchema, listTimeLogQuerySchema } from './timelog.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export class TimeLogService {
  constructor(
    private readonly repository: TimeLogRepository = new TimeLogRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
    private readonly taskRepository: TaskRepository = new TaskRepository(),
  ) {}

  private async requireEmployeeProfile(userId: string) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');
    return profile;
  }

  private async requireTaskInTenant(tenantId: string, taskId: string) {
    const task = await this.taskRepository.findById(taskId);
    if (!task || task.tenantId !== tenantId) throw new NotFoundError('Task not found');
    return task;
  }

  /** One running timer per employee — a second concurrent timer would double-count the same wall-clock minutes. */
  async startTimer(userId: string, tenantId: string, input: z.infer<typeof startTimerSchema>, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);

    const running = await this.repository.findRunning(profile.id);
    if (running) throw new ConflictError('You already have a running timer — stop it before starting another');

    if (input.taskId) await this.requireTaskInTenant(tenantId, input.taskId);

    const record = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: profile.id } },
      task: input.taskId ? { connect: { id: input.taskId } } : undefined,
      description: input.description,
      startedAt: new Date(),
      source: 'TIMER',
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TIME_TIMER_STARTED',
      targetType: 'TimeLog',
      targetId: record.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  }

  async stopTimer(userId: string, tenantId: string, description: string | undefined, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);

    const running = await this.repository.findRunning(profile.id);
    if (!running) throw new NotFoundError('You do not have a running timer');

    const endedAt = new Date();
    const durationMinutes = minutesBetween(running.startedAt, endedAt);
    const updated = await this.repository.closeAndRollUp(running.id, endedAt, durationMinutes, running.taskId, description);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TIME_TIMER_STOPPED',
      targetType: 'TimeLog',
      targetId: running.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  async getRunning(userId: string) {
    const profile = await this.requireEmployeeProfile(userId);
    return this.repository.findRunning(profile.id);
  }

  async logManual(userId: string, tenantId: string, input: z.infer<typeof manualTimeLogSchema>, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);
    if (input.taskId) await this.requireTaskInTenant(tenantId, input.taskId);

    const endedAt = new Date(input.startedAt.getTime() + input.durationMinutes * 60000);
    const record = await this.repository.createAndRollUp(
      {
        tenant: { connect: { id: tenantId } },
        employee: { connect: { id: profile.id } },
        task: input.taskId ? { connect: { id: input.taskId } } : undefined,
        description: input.description,
        startedAt: input.startedAt,
        endedAt,
        durationMinutes: input.durationMinutes,
        source: 'MANUAL',
      },
      input.taskId ?? null,
      input.durationMinutes,
    );

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TIME_LOG_CREATED',
      targetType: 'TimeLog',
      targetId: record.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  }

  async delete(userId: string, tenantId: string, id: string, canManageTenant: boolean, meta: RequestMeta) {
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Time log not found');

    if (!canManageTenant) {
      const profile = await this.requireEmployeeProfile(userId);
      if (record.employeeId !== profile.id) throw new ForbiddenError('You can only delete your own time logs');
    }

    await this.repository.deleteAndRollBack(id, record.taskId, record.durationMinutes);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TIME_LOG_DELETED',
      targetType: 'TimeLog',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  private async resolveScope(tenantId: string, requester: { userId: string; canReadTenant: boolean }, requestedEmployeeId?: string) {
    if (requester.canReadTenant) return requestedEmployeeId;
    const own = await this.requireEmployeeProfile(requester.userId);
    if (requestedEmployeeId && requestedEmployeeId !== own.id) {
      const target = await this.employeeRepository.findById(requestedEmployeeId);
      if (target?.managerId !== own.id) throw new ForbiddenError("Cannot view another employee's time logs");
      return requestedEmployeeId;
    }
    return own.id;
  }

  async list(
    tenantId: string,
    requester: { userId: string; canReadTenant: boolean },
    query: z.infer<typeof listTimeLogQuerySchema>,
  ) {
    const employeeId = await this.resolveScope(tenantId, requester, query.employeeId);
    const filter: TimeLogFilter = { employeeId, taskId: query.taskId, from: query.from, to: query.to };
    const orderBy = toPrismaOrderBy(query.sort, TIMELOG_SORTABLE_FIELDS, { field: 'startedAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(tenantId, filter, orderBy, (query.page - 1) * query.limit, query.limit);
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async summary(
    tenantId: string,
    requester: { userId: string; canReadTenant: boolean },
    query: z.infer<typeof listTimeLogQuerySchema>,
  ) {
    const employeeId = await this.resolveScope(tenantId, requester, query.employeeId);
    const filter: TimeLogFilter = { employeeId, taskId: query.taskId, from: query.from, to: query.to };
    const { totalMinutes, entryCount } = await this.repository.sumMinutes(tenantId, filter);
    return { totalMinutes, totalHours: Math.round((totalMinutes / 60) * 100) / 100, entryCount };
  }
}

export const timeLogService = new TimeLogService();
