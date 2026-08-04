import { SopRepository } from './sop.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createSopSchema, updateSopSchema, listSopsQuerySchema } from './sop.validators.js';

const SOP_SORTABLE_FIELDS = ['title', 'status', 'version', 'updatedAt', 'createdAt'] as const;

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SopService {
  constructor(
    private readonly repository: SopRepository = new SopRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async resolveActorEmployeeId(actorUserId: string | undefined) {
    if (!actorUserId) return undefined;
    const employee = await this.employeeRepository.findByUserId(actorUserId);
    return employee?.id;
  }

  async create(tenantId: string, input: z.infer<typeof createSopSchema>, meta: RequestMeta) {
    const existing = await this.repository.findByTitle(tenantId, input.title);
    if (existing) throw new ConflictError('An SOP with this title already exists');

    const sop = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      title: input.title,
      category: input.category,
      department: input.department,
      body: input.body,
      fileUrl: input.fileUrl,
      owner: input.ownerId ? { connect: { id: input.ownerId } } : undefined,
    });
    await this.audit(tenantId, meta, 'SOP_CREATED', sop.id);
    return sop;
  }

  async requireSop(tenantId: string, id: string) {
    const sop = await this.repository.findById(id);
    if (!sop || sop.tenantId !== tenantId) throw new NotFoundError('SOP not found');
    return sop;
  }

  /** A body edit on a published SOP is a revision (snapshot + version bump); on a draft it's just an in-place edit — nothing to snapshot yet. */
  async update(tenantId: string, id: string, input: z.infer<typeof updateSopSchema>, meta: RequestMeta) {
    const sop = await this.requireSop(tenantId, id);
    if (sop.status === 'ARCHIVED') throw new ConflictError('An archived SOP cannot be edited');

    const { body, ...rest } = input;
    const changesBody = body !== undefined && body !== sop.body;

    if (changesBody && sop.status === 'PUBLISHED') {
      const changedById = await this.resolveActorEmployeeId(meta.actorUserId);
      await this.repository.reviseAndUpdate(id, tenantId, sop.version, sop.body, body, changedById);
    }

    const updated = await this.repository.update(id, {
      ...rest,
      body: changesBody && sop.status !== 'PUBLISHED' ? body : undefined,
      owner: rest.ownerId === undefined ? undefined : rest.ownerId === null ? { disconnect: true } : { connect: { id: rest.ownerId } },
    });
    await this.audit(tenantId, meta, 'SOP_UPDATED', id);
    return updated;
  }

  async publish(tenantId: string, id: string, meta: RequestMeta) {
    const sop = await this.requireSop(tenantId, id);
    if (sop.status !== 'DRAFT') throw new ConflictError('Only a draft SOP can be published');

    const updated = await this.repository.update(id, { status: 'PUBLISHED', publishedAt: new Date() });
    await this.audit(tenantId, meta, 'SOP_PUBLISHED', id);
    return updated;
  }

  async archive(tenantId: string, id: string, meta: RequestMeta) {
    const sop = await this.requireSop(tenantId, id);
    if (sop.status !== 'PUBLISHED') throw new ConflictError('Only a published SOP can be archived');

    const updated = await this.repository.update(id, { status: 'ARCHIVED' });
    await this.audit(tenantId, meta, 'SOP_ARCHIVED', id);
    return updated;
  }

  /** Once published, an SOP is part of the historical record — only a still-draft one can be deleted outright. */
  async delete(tenantId: string, id: string, meta: RequestMeta) {
    const sop = await this.requireSop(tenantId, id);
    if (sop.status !== 'DRAFT') throw new ConflictError('Only a draft SOP can be deleted — archive it instead');

    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'SOP_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listSopsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, SOP_SORTABLE_FIELDS, { field: 'updatedAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, category: query.category, department: query.department, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async listRevisions(tenantId: string, id: string) {
    await this.requireSop(tenantId, id);
    return this.repository.findRevisions(id);
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
      targetType: 'Sop',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const sopService = new SopService();
