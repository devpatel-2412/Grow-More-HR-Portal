import { TaskRepository } from './task.repository.js';
import { ProjectService } from '../projects/project.service.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from './task.validators.js';

/** Fields a task's own assignee may change without TASK_MANAGE — everything else (reassignment, priority, title, project) needs the permission. */
const SELF_SERVICE_FIELDS = new Set(['status', 'loggedHours']);

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TaskService {
  constructor(
    private readonly repository: TaskRepository = new TaskRepository(),
    private readonly projectService: ProjectService = new ProjectService(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async create(tenantId: string, input: z.infer<typeof createTaskSchema>, meta: RequestMeta = {}) {
    await this.projectService.getById(tenantId, input.projectId); // 404s if the project isn't in this tenant

    const task = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      project: { connect: { id: input.projectId } },
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate,
      assignedTo: input.assignedToId ? { connect: { id: input.assignedToId } } : undefined,
      parentTask: input.parentTaskId ? { connect: { id: input.parentTaskId } } : undefined,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TASK_CREATED',
      targetType: 'Task',
      targetId: task.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return task;
  }

  async getById(tenantId: string, id: string) {
    const task = await this.repository.findById(id);
    if (!task || task.tenantId !== tenantId) throw new NotFoundError('Task not found');
    return task;
  }

  async update(
    tenantId: string,
    userId: string,
    hasTaskManage: boolean,
    id: string,
    input: z.infer<typeof updateTaskSchema>,
    meta: RequestMeta = {},
  ) {
    const task = await this.getById(tenantId, id);
    const changedFields = Object.keys(input);

    if (!hasTaskManage) {
      const isSelfServiceOnly = changedFields.every((field) => SELF_SERVICE_FIELDS.has(field));
      if (!isSelfServiceOnly) {
        throw new ForbiddenError('Only a task manager can change this field');
      }
      const profile = await this.employeeRepository.findByUserId(userId);
      if (!profile || profile.id !== task.assignedToId) {
        throw new ForbiddenError('You can only update tasks assigned to you');
      }
    }

    const updated = await this.repository.update(id, input);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TASK_UPDATED',
      targetType: 'Task',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  async delete(tenantId: string, id: string, meta: RequestMeta = {}) {
    await this.getById(tenantId, id);
    await this.repository.delete(id);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'TASK_DELETED',
      targetType: 'Task',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async list(tenantId: string, query: z.infer<typeof listTasksQuerySchema>) {
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { projectId: query.projectId, status: query.status, priority: query.priority, assignedToId: query.assignedToId },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const taskService = new TaskService();
