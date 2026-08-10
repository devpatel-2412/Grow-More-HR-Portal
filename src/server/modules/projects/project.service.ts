import { ProjectRepository } from './project.repository.js';
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

export class ProjectService {
  constructor(private readonly repository: ProjectRepository = new ProjectRepository()) {}

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

    return project;
  }

  async getById(tenantId: string, id: string) {
    const project = await this.repository.findById(id);
    if (!project || project.tenantId !== tenantId) throw new NotFoundError('Project not found');
    return project;
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

    return updated;
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

  async list(tenantId: string, query: z.infer<typeof listProjectsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, PROJECT_SORTABLE_FIELDS, { field: 'startDate', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const projectService = new ProjectService();
