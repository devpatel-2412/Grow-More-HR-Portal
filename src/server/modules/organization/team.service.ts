import { TeamRepository } from './team.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createTeamSchema, updateTeamSchema, listTeamsQuerySchema } from './team.validators.js';

const TEAM_SORTABLE_FIELDS = ['name', 'createdAt'] as const;

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TeamService {
  constructor(private readonly repository: TeamRepository = new TeamRepository()) {}

  async create(tenantId: string, input: z.infer<typeof createTeamSchema>, meta: RequestMeta) {
    const existing = await this.repository.findByName(tenantId, input.name);
    if (existing) throw new ConflictError('A team with this name already exists');

    const team = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      name: input.name,
      description: input.description,
      branch: input.branchId ? { connect: { id: input.branchId } } : undefined,
      lead: input.leadId ? { connect: { id: input.leadId } } : undefined,
    });
    await this.audit(tenantId, meta, 'TEAM_CREATED', team.id);
    return team;
  }

  async requireTeam(tenantId: string, id: string) {
    const team = await this.repository.findById(id);
    if (!team || team.tenantId !== tenantId) throw new NotFoundError('Team not found');
    return team;
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateTeamSchema>, meta: RequestMeta) {
    await this.requireTeam(tenantId, id);
    if (input.name) {
      const existing = await this.repository.findByName(tenantId, input.name);
      if (existing && existing.id !== id) throw new ConflictError('A team with this name already exists');
    }

    const updated = await this.repository.update(id, {
      name: input.name,
      description: input.description,
      branch: input.branchId === undefined ? undefined : input.branchId === null ? { disconnect: true } : { connect: { id: input.branchId } },
      lead: input.leadId === undefined ? undefined : input.leadId === null ? { disconnect: true } : { connect: { id: input.leadId } },
    });
    await this.audit(tenantId, meta, 'TEAM_UPDATED', id);
    return updated;
  }

  /** A team still holding members can't be deleted out from under them — reassign or remove members first. */
  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireTeam(tenantId, id);
    const memberCount = await this.repository.countMembers(id);
    if (memberCount > 0) throw new ConflictError('Cannot delete a team with members assigned to it');

    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'TEAM_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listTeamsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, TEAM_SORTABLE_FIELDS, { field: 'name', direction: 'asc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { branchId: query.branchId, search: query.search },
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
      targetType: 'Team',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const teamService = new TeamService();
