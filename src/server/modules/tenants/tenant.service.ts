import { TenantRepository } from './tenant.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createTenantSchema, updateTenantSchema } from './tenant.validators.js';

export interface RequestContext {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TenantService {
  constructor(private readonly repository: TenantRepository = new TenantRepository()) {}

  async create(input: z.infer<typeof createTenantSchema>, ctx: RequestContext = {}) {
    const existing = await this.repository.findByDomain(input.domain);
    if (existing) throw new ConflictError('A tenant with this domain already exists');

    const tenant = await this.repository.create({
      name: input.name,
      domain: input.domain,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      font: input.font,
    });

    await auditLogService.record({
      tenantId: tenant.id,
      actorUserId: ctx.actorUserId,
      action: 'TENANT_CREATED',
      targetType: 'Tenant',
      targetId: tenant.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return tenant;
  }

  async getById(id: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new NotFoundError('Tenant not found');
    return tenant;
  }

  async update(id: string, input: z.infer<typeof updateTenantSchema>, ctx: RequestContext = {}) {
    await this.getById(id);
    const tenant = await this.repository.update(id, input);

    await auditLogService.record({
      tenantId: id,
      actorUserId: ctx.actorUserId,
      action: 'TENANT_UPDATED',
      targetType: 'Tenant',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: input,
    });

    return tenant;
  }

  async list(page: number, limit: number, search?: string) {
    const { rows, total } = await this.repository.findMany((page - 1) * limit, limit, search);
    return { rows, meta: buildPaginationMeta(page, limit, total) };
  }
}

export const tenantService = new TenantService();
