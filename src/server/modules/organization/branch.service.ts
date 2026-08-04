import { BranchRepository } from './branch.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createBranchSchema, updateBranchSchema, listBranchesQuerySchema } from './branch.validators.js';

const BRANCH_SORTABLE_FIELDS = ['name', 'code', 'city', 'createdAt'] as const;

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class BranchService {
  constructor(private readonly repository: BranchRepository = new BranchRepository()) {}

  async create(tenantId: string, input: z.infer<typeof createBranchSchema>, meta: RequestMeta) {
    const existing = await this.repository.findByCode(tenantId, input.code);
    if (existing) throw new ConflictError('A branch with this code already exists');

    const branch = await this.repository.create({ tenant: { connect: { id: tenantId } }, ...input });
    await this.audit(tenantId, meta, 'BRANCH_CREATED', branch.id);
    return branch;
  }

  async requireBranch(tenantId: string, id: string) {
    const branch = await this.repository.findById(id);
    if (!branch || branch.tenantId !== tenantId) throw new NotFoundError('Branch not found');
    return branch;
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateBranchSchema>, meta: RequestMeta) {
    await this.requireBranch(tenantId, id);
    if (input.code) {
      const existing = await this.repository.findByCode(tenantId, input.code);
      if (existing && existing.id !== id) throw new ConflictError('A branch with this code already exists');
    }

    const updated = await this.repository.update(id, input);
    await this.audit(tenantId, meta, 'BRANCH_UPDATED', id);
    return updated;
  }

  /** A branch still holding employees or teams can't be deleted out from under them — reassign first. */
  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireBranch(tenantId, id);
    const [employeeCount, teamCount] = await Promise.all([
      this.repository.countEmployees(id),
      this.repository.countTeams(id),
    ]);
    if (employeeCount > 0) throw new ConflictError('Cannot delete a branch with employees assigned to it');
    if (teamCount > 0) throw new ConflictError('Cannot delete a branch with teams assigned to it');

    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'BRANCH_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listBranchesQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, BRANCH_SORTABLE_FIELDS, { field: 'name', direction: 'asc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { search: query.search },
      orderBy,
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
      targetType: 'Branch',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const branchService = new BranchService();
