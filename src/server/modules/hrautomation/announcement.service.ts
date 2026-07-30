import { AnnouncementRepository } from './announcement.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createAnnouncementSchema, listAnnouncementsQuerySchema } from './announcement.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AnnouncementService {
  constructor(
    private readonly repository: AnnouncementRepository = new AnnouncementRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async publish(tenantId: string, userId: string | undefined, input: z.infer<typeof createAnnouncementSchema>, meta: RequestMeta) {
    const publisher = userId ? await this.employeeRepository.findByUserId(userId) : null;
    const announcement = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      publishedBy: publisher ? { connect: { id: publisher.id } } : undefined,
      ...input,
    });
    await this.audit(tenantId, meta, 'ANNOUNCEMENT_PUBLISHED', announcement.id);
    return announcement;
  }

  async delete(tenantId: string, id: string, meta: RequestMeta) {
    const announcement = await this.repository.findById(id);
    if (!announcement || announcement.tenantId !== tenantId) throw new NotFoundError('Announcement not found');
    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'ANNOUNCEMENT_DELETED', id);
  }

  async list(tenantId: string, userId: string, query: z.infer<typeof listAnnouncementsQuerySchema>) {
    const profile = await this.employeeRepository.findByUserId(userId);
    const { rows, total } = await this.repository.findVisible(
      tenantId,
      profile?.department,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private audit(
    tenantId: string,
    meta: RequestMeta,
    action: Parameters<typeof auditLogService.record>[0]['action'],
    targetId: string,
  ) {
    return auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action,
      targetType: 'Announcement',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const announcementService = new AnnouncementService();
