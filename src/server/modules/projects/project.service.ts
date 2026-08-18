import { ProjectRepository, type ProjectTaskSummary } from './project.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const PROJECT_SORTABLE_FIELDS = ['name', 'startDate', 'endDate', 'status'] as const;
import type { z } from 'zod';
import type { createProjectSchema, updateProjectSchema, listProjectsQuerySchema } from './project.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Caller context for visibility scoping. Omit entirely for internal/trusted call sites (already
 * permission-gated at the route level, or a plain existence check) — only pass it where the
 * caller might lack `project:manage` and needs their view scoped to projects they're actually on.
 */
export interface ProjectViewer {
  userId: string;
  hasProjectManage: boolean;
}

const EMPTY_SUMMARY: ProjectTaskSummary = { totalTasks: 0, openTasks: 0, completedTasks: 0, members: [], myOpenTasks: 0 };

function withSummary<T extends { id: string }>(project: T, summary: ProjectTaskSummary | undefined) {
  const s = summary ?? EMPTY_SUMMARY;
  return {
    ...project,
    progress: s.totalTasks === 0 ? 0 : Math.round((s.completedTasks / s.totalTasks) * 100),
    openTasksCount: s.openTasks,
    totalTasksCount: s.totalTasks,
    members: s.members,
    myOpenTasksCount: s.myOpenTasks,
  };
}

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository = new ProjectRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async resolveViewerEmployeeId(userId: string): Promise<string | null> {
    const profile = await this.employeeRepository.findByUserId(userId);
    return profile?.id ?? null;
  }

  async create(tenantId: string, input: z.infer<typeof createProjectSchema>, meta: RequestMeta = {}) {
    const project = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'PROJECT_CREATED',
      targetType: 'Project',
      targetId: project.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return withSummary(project, undefined);
  }

  /**
   * `viewer` omitted → unrestricted tenant lookup (existing behavior — used by internal call sites
   * that are already permission-gated at the route, e.g. task/milestone creation's existence check).
   * `viewer` given and lacking project:manage → 404s unless the viewer has ≥1 task assigned to them
   * in this project (the only real "project membership" signal this schema has — see
   * Task.assignedToId. No ProjectMember table exists, and none is being introduced here).
   */
  async getById(tenantId: string, id: string, viewer?: ProjectViewer) {
    if (!viewer || viewer.hasProjectManage) {
      const project = await this.repository.findById(id);
      if (!project || project.tenantId !== tenantId) throw new NotFoundError('Project not found');
      const viewerEmployeeId = viewer ? await this.resolveViewerEmployeeId(viewer.userId) : null;
      const summary = (await this.repository.getTaskSummaries([id], viewerEmployeeId)).get(id);
      return withSummary(project, summary);
    }

    const employeeId = await this.resolveViewerEmployeeId(viewer.userId);
    if (!employeeId) throw new NotFoundError('Project not found');
    const project = await this.repository.findByIdForEmployee(id, tenantId, employeeId);
    if (!project) throw new NotFoundError('Project not found');
    const summary = (await this.repository.getTaskSummaries([id], employeeId)).get(id);
    return withSummary(project, summary);
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateProjectSchema>, meta: RequestMeta = {}) {
    await this.getById(tenantId, id);
    const updated = await this.repository.update(id, input);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'PROJECT_UPDATED',
      targetType: 'Project',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return withSummary(updated, undefined);
  }

  async delete(tenantId: string, id: string, meta: RequestMeta = {}) {
    await this.getById(tenantId, id);
    await this.repository.delete(id);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'PROJECT_DELETED',
      targetType: 'Project',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  async list(tenantId: string, query: z.infer<typeof listProjectsQuerySchema>, viewer?: ProjectViewer) {
    let scopeEmployeeId: string | undefined;
    let viewerEmployeeId: string | null = null;

    if (viewer) {
      viewerEmployeeId = await this.resolveViewerEmployeeId(viewer.userId);
      if (!viewer.hasProjectManage) {
        if (!viewerEmployeeId) return { rows: [], meta: buildPaginationMeta(query.page, query.limit, 0) };
        scopeEmployeeId = viewerEmployeeId;
      }
    }

    const orderBy = toPrismaOrderBy(query.sort, PROJECT_SORTABLE_FIELDS, { field: 'startDate', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, search: query.search, assignedEmployeeId: scopeEmployeeId },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );

    const summaries = await this.repository.getTaskSummaries(
      rows.map((r) => r.id),
      viewerEmployeeId,
    );
    const enriched = rows.map((r) => withSummary(r, summaries.get(r.id)));

    return { rows: enriched, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const projectService = new ProjectService();
