import { MilestoneRepository } from './milestone.repository.js';
import { ProjectService, type RequestMeta } from './project.service.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import type { z } from 'zod';
import type { createMilestoneSchema, updateMilestoneSchema } from './project.validators.js';

export class MilestoneService {
  constructor(
    private readonly repository: MilestoneRepository = new MilestoneRepository(),
    private readonly projectService: ProjectService = new ProjectService(),
  ) {}

  private async requireInTenant(tenantId: string, id: string) {
    const milestone = await this.repository.findById(id);
    if (!milestone || milestone.tenantId !== tenantId) throw new NotFoundError('Milestone not found');
    return milestone;
  }

  async create(tenantId: string, projectId: string, input: z.infer<typeof createMilestoneSchema>, meta: RequestMeta = {}) {
    await this.projectService.getById(tenantId, projectId); // 404s if the project isn't in this tenant
    const milestone = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      project: { connect: { id: projectId } },
      name: input.name,
      dueDate: input.dueDate,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'MILESTONE_CREATED',
      targetType: 'Milestone',
      targetId: milestone.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return milestone;
  }

  async listForProject(tenantId: string, projectId: string) {
    await this.projectService.getById(tenantId, projectId);
    return this.repository.findByProject(projectId);
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateMilestoneSchema>, meta: RequestMeta = {}) {
    await this.requireInTenant(tenantId, id);
    const updated = await this.repository.update(id, input);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'MILESTONE_UPDATED',
      targetType: 'Milestone',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  async delete(tenantId: string, id: string, meta: RequestMeta = {}) {
    await this.requireInTenant(tenantId, id);
    await this.repository.delete(id);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'MILESTONE_DELETED',
      targetType: 'Milestone',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const milestoneService = new MilestoneService();
