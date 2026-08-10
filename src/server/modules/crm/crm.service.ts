import { LeadRepository, CrmActivityRepository } from './crm.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const LEAD_SORTABLE_FIELDS = ['companyName', 'contactName', 'status', 'estimatedValue', 'createdAt', 'updatedAt'] as const;
const CRM_ACTIVITY_SORTABLE_FIELDS = ['subject', 'type', 'occurredAt', 'createdAt'] as const;
import type { LeadStatus } from '@prisma/client';
import type { z } from 'zod';
import type { createLeadSchema, updateLeadSchema, listLeadsQuerySchema, logActivitySchema, listActivitiesQuerySchema } from './crm.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Sales pipeline. A lead advances through the funnel and may be marked LOST at any live stage.
 * WON and LOST are terminal.
 */
const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['WON', 'LOST'],
  WON: [],
  LOST: [],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}

export class CrmService {
  constructor(
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly activityRepository: CrmActivityRepository = new CrmActivityRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireEmployeeInTenant(tenantId: string, employeeId: string, label: string) {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError(`${label} not found`);
    return employee;
  }

  // ---------------------------------------------------------------- leads

  async createLead(tenantId: string, input: z.infer<typeof createLeadSchema>, meta: RequestMeta) {
    const existing = await this.leadRepository.findByEmail(tenantId, input.email);
    if (existing) throw new ConflictError('A lead with this email already exists');

    if (input.ownerId) await this.requireEmployeeInTenant(tenantId, input.ownerId, 'Lead owner');

    const { ownerId, ...rest } = input;
    const lead = await this.leadRepository.create({
      tenant: { connect: { id: tenantId } },
      owner: ownerId ? { connect: { id: ownerId } } : undefined,
      ...rest,
    });

    await this.audit(tenantId, meta, 'LEAD_CREATED', 'Lead', lead.id);
    return lead;
  }

  async requireLead(tenantId: string, id: string) {
    const lead = await this.leadRepository.findById(id);
    if (!lead || lead.tenantId !== tenantId) throw new NotFoundError('Lead not found');
    return lead;
  }

  async getLead(tenantId: string, id: string) {
    return this.requireLead(tenantId, id);
  }

  async updateLead(tenantId: string, id: string, input: z.infer<typeof updateLeadSchema>, meta: RequestMeta) {
    await this.requireLead(tenantId, id);
    if (input.ownerId) await this.requireEmployeeInTenant(tenantId, input.ownerId, 'Lead owner');

    const { ownerId, ...rest } = input;
    const updated = await this.leadRepository.update(id, {
      ...rest,
      owner: ownerId === undefined ? undefined : ownerId === null ? { disconnect: true } : { connect: { id: ownerId } },
    });

    await this.audit(tenantId, meta, 'LEAD_UPDATED', 'Lead', id);
    return updated;
  }

  async changeLeadStage(
    tenantId: string,
    id: string,
    status: LeadStatus,
    lostReason: string | undefined,
    meta: RequestMeta,
  ) {
    const lead = await this.requireLead(tenantId, id);

    if (lead.status === status) throw new ConflictError(`Lead is already at the ${status} stage`);
    if (!canTransitionLead(lead.status, status)) {
      throw new ConflictError(`A lead at ${lead.status} cannot move to ${status}`);
    }

    const updated = await this.leadRepository.update(id, {
      status,
      lostReason: status === 'LOST' ? lostReason : null,
    });

    await this.audit(tenantId, meta, status === 'WON' ? 'LEAD_CONVERTED' : 'LEAD_STAGE_CHANGED', 'Lead', id);
    return updated;
  }

  async deleteLead(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireLead(tenantId, id);
    await this.leadRepository.delete(id);
    await this.audit(tenantId, meta, 'LEAD_DELETED', 'Lead', id);
  }

  async listLeads(tenantId: string, query: z.infer<typeof listLeadsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, LEAD_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.leadRepository.findMany(
      tenantId,
      { status: query.status, ownerId: query.ownerId, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  leadPipelineSummary(tenantId: string) {
    return this.leadRepository.summarise(tenantId);
  }

  // ---------------------------------------------------------------- activities

  async logActivity(tenantId: string, userId: string, input: z.infer<typeof logActivitySchema>, meta: RequestMeta) {
    if (input.leadId) await this.requireLead(tenantId, input.leadId);

    const author = await this.employeeRepository.findByUserId(userId);

    const { leadId, ...rest } = input;
    const activity = await this.activityRepository.create({
      tenant: { connect: { id: tenantId } },
      lead: leadId ? { connect: { id: leadId } } : undefined,
      createdBy: author ? { connect: { id: author.id } } : undefined,
      ...rest,
    });

    await this.audit(tenantId, meta, 'CRM_ACTIVITY_LOGGED', 'CrmActivity', activity.id);
    return activity;
  }

  async listActivities(tenantId: string, query: z.infer<typeof listActivitiesQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, CRM_ACTIVITY_SORTABLE_FIELDS, { field: 'occurredAt', direction: 'desc' });
    const { rows, total } = await this.activityRepository.findMany(
      tenantId,
      { leadId: query.leadId, type: query.type },
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
    targetType: string,
    targetId: string,
  ) {
    return auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action,
      targetType,
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const crmService = new CrmService();
