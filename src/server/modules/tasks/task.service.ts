import { TaskRepository } from './task.repository.js';
import { ProjectService, type ProjectViewer } from '../projects/project.service.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { env } from '../../shared/config/env.js';
import {
  projectAssignedEmailTemplate,
  taskAssignedEmailTemplate,
  taskReadyForReviewEmailTemplate,
  taskCompletedEmailTemplate,
  taskReopenedEmailTemplate,
} from '../../shared/email/email.templates.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const TASK_SORTABLE_FIELDS = ['title', 'priority', 'status', 'dueDate', 'createdAt'] as const;
import type { z } from 'zod';
import type { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from './task.validators.js';

/** Fields a task's own assignee may change without TASK_MANAGE — everything else (reassignment, priority, title, project) needs the permission. */
const SELF_SERVICE_FIELDS = new Set(['status', 'loggedHours']);

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ProjectSummary {
  id: string;
  name: string;
}

interface TaskSummary {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
}

interface EmployeeSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  managerId: string | null;
}

export class TaskService {
  constructor(
    private readonly repository: TaskRepository = new TaskRepository(),
    private readonly projectService: ProjectService = new ProjectService(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async create(tenantId: string, input: z.infer<typeof createTaskSchema>, meta: RequestMeta = {}) {
    const project = await this.projectService.getById(tenantId, input.projectId); // 404s if the project isn't in this tenant

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

    if (input.assignedToId) {
      await this.handleAssignment(tenantId, input.assignedToId, project, task, task.id, meta.actorUserId);
    }

    return task;
  }

  /**
   * Fires on every new/changed task assignment: a TASK_ASSIGNED notification always, plus a
   * PROJECT_ASSIGNED one the first time this employee has any task on this project — the closest
   * real equivalent to "assigned to the project" this schema supports (there's no separate
   * ProjectMember concept; see project.service.ts's viewer-scoping for the same convention).
   * `excludeTaskId` keeps the "already on this project" check from counting the very task being
   * (re)assigned as pre-existing evidence of membership.
   */
  private async handleAssignment(
    tenantId: string,
    assignedToId: string,
    project: ProjectSummary,
    task: TaskSummary,
    excludeTaskId: string,
    actorUserId: string | undefined,
  ) {
    const assignee = await this.employeeRepository.findById(assignedToId);
    if (!assignee) return;

    const taskLink = `/projects/${project.id}`;

    await notificationService.notify({
      tenantId,
      userId: assignee.userId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned to you',
      body: task.title,
      link: taskLink,
      emailOverride: taskAssignedEmailTemplate({
        employeeName: assignee.firstName,
        taskTitle: task.title,
        projectName: project.name,
        priority: task.priority,
        dueDate: task.dueDate,
        taskLink,
        appUrl: env.APP_URL,
      }),
    });

    // Do not send a duplicate "assigned to project" notification if they're already on it.
    const alreadyOnProject = await this.repository.existsForEmployeeInProject(project.id, assignedToId, excludeTaskId);
    if (!alreadyOnProject) {
      const actorName = await this.resolveActorName(actorUserId);
      await notificationService.notify({
        tenantId,
        userId: assignee.userId,
        type: 'PROJECT_ASSIGNED',
        title: 'New project assignment',
        body: `You have been assigned to the project ${project.name} by ${actorName}.`,
        link: taskLink,
        emailOverride: projectAssignedEmailTemplate({
          employeeName: assignee.firstName,
          projectName: project.name,
          managerName: actorName,
          projectLink: taskLink,
          appUrl: env.APP_URL,
        }),
      });
    }
  }

  private async resolveActorName(actorUserId: string | undefined): Promise<string> {
    if (!actorUserId) return 'your manager';
    const profile = await this.employeeRepository.findByUserId(actorUserId);
    return profile ? `${profile.firstName} ${profile.lastName}` : 'your manager';
  }

  /** The assignee's direct reporting manager (EmployeeProfile.managerId) — the same "responsible
   * manager" concept the Leave module already routes approvals through. Returns null when the
   * employee has no manager configured; there's simply no one to notify in that case. */
  private async resolveResponsibleManager(employeeId: string): Promise<EmployeeSummary | null> {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee?.managerId) return null;
    return this.employeeRepository.findById(employee.managerId);
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

    // Reassignment — only when the assignee actually changes, never on an unrelated field edit.
    if (input.assignedToId && input.assignedToId !== task.assignedToId) {
      const project = await this.projectService.getById(tenantId, task.projectId);
      await this.handleAssignment(tenantId, input.assignedToId, project, updated, id, meta.actorUserId);
    }

    // Status change — only when the status actually changes, and only for the three transitions
    // that are genuinely actionable for someone else (never "an email for every status change").
    if (input.status && input.status !== task.status) {
      await this.handleStatusChange(tenantId, task, input.status, userId);
    }

    return updated;
  }

  private async handleStatusChange(
    tenantId: string,
    previousTask: { id: string; title: string; status: string; projectId: string; assignedToId: string | null },
    newStatus: string,
    actorUserId: string,
  ) {
    if (!previousTask.assignedToId) return; // unassigned task — no one to route this to
    const assignee = await this.employeeRepository.findById(previousTask.assignedToId);
    if (!assignee) return;

    const project = await this.projectService.getById(tenantId, previousTask.projectId);
    const taskLink = `/projects/${project.id}`;
    const wasDone = previousTask.status === 'DONE';
    const isDone = newStatus === 'DONE';

    if (wasDone && !isDone) {
      // Reopened — both the assignee and their responsible manager need to know.
      await notificationService.notify({
        tenantId,
        userId: assignee.userId,
        type: 'TASK_REOPENED',
        title: 'Task reopened',
        body: `"${previousTask.title}" was reopened.`,
        link: taskLink,
        emailOverride: taskReopenedEmailTemplate({
          recipientName: assignee.firstName,
          taskTitle: previousTask.title,
          projectName: project.name,
          taskLink,
          appUrl: env.APP_URL,
        }),
      });

      const manager = await this.resolveResponsibleManager(previousTask.assignedToId);
      if (manager) {
        await notificationService.notify({
          tenantId,
          userId: manager.userId,
          type: 'TASK_REOPENED',
          title: 'Task reopened',
          body: `"${previousTask.title}" (${assignee.firstName} ${assignee.lastName}) was reopened.`,
          link: taskLink,
          emailOverride: taskReopenedEmailTemplate({
            recipientName: manager.firstName,
            taskTitle: previousTask.title,
            projectName: project.name,
            taskLink,
            appUrl: env.APP_URL,
          }),
        });
      }
      return;
    }

    if (newStatus === 'REVIEW') {
      const manager = await this.resolveResponsibleManager(previousTask.assignedToId);
      if (!manager) return;
      await notificationService.notify({
        tenantId,
        userId: manager.userId,
        type: 'TASK_READY_FOR_REVIEW',
        title: 'Task ready for review',
        body: `${assignee.firstName} ${assignee.lastName} marked "${previousTask.title}" ready for review.`,
        link: taskLink,
        emailOverride: taskReadyForReviewEmailTemplate({
          managerName: manager.firstName,
          employeeName: `${assignee.firstName} ${assignee.lastName}`,
          taskTitle: previousTask.title,
          projectName: project.name,
          taskLink,
          appUrl: env.APP_URL,
        }),
      });
      return;
    }

    if (isDone) {
      // Only notify the assignee when someone else (their manager) closed it out — telling
      // someone what they just did themselves isn't a notification, it's noise.
      const actorProfile = await this.employeeRepository.findByUserId(actorUserId);
      if (actorProfile?.id === previousTask.assignedToId) return;

      await notificationService.notify({
        tenantId,
        userId: assignee.userId,
        type: 'TASK_COMPLETED',
        title: 'Task completed',
        body: `"${previousTask.title}" was marked done.`,
        link: taskLink,
        emailOverride: taskCompletedEmailTemplate({
          employeeName: assignee.firstName,
          taskTitle: previousTask.title,
          projectName: project.name,
          taskLink,
          appUrl: env.APP_URL,
        }),
      });
    }
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

  async list(tenantId: string, query: z.infer<typeof listTasksQuerySchema>, viewer?: ProjectViewer) {
    if (query.projectId) {
      // 404s if the viewer isn't project:manage and has no task assigned to them in this project —
      // otherwise a TASK_VIEW_ASSIGNED/TASK_MANAGE holder could enumerate any project's tasks by
      // guessing its id, bypassing the project-level visibility scoping entirely.
      await this.projectService.getById(tenantId, query.projectId, viewer);
    }
    const orderBy = toPrismaOrderBy(query.sort, TASK_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { projectId: query.projectId, status: query.status, priority: query.priority, assignedToId: query.assignedToId },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const taskService = new TaskService();
