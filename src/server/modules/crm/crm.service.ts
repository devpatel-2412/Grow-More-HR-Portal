import { LeadRepository, ClientRepository, ContactRepository, CrmActivityRepository } from './crm.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const LEAD_SORTABLE_FIELDS = ['companyName', 'contactName', 'status', 'estimatedValue', 'createdAt', 'updatedAt'] as const;
const CLIENT_SORTABLE_FIELDS = ['companyName', 'status', 'industry', 'createdAt', 'updatedAt'] as const;
const CRM_ACTIVITY_SORTABLE_FIELDS = ['subject', 'type', 'occurredAt', 'createdAt'] as const;
import type { LeadStatus } from '@prisma/client';
import type { z } from 'zod';
import type {
  createLeadSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  convertLeadSchema,
  createClientSchema,
  updateClientSchema,
  listClientsQuerySchema,
  createContactSchema,
  logActivitySchema,
  listActivitiesQuerySchema,
} from './crm.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Sales pipeline. A lead advances through the funnel, may be marked LOST at any live stage, and
 * WON is only reachable via conversion (which also creates the client) so a "won" lead always has
 * a client record behind it. WON and LOST are terminal.
 */
const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['LOST'],
  WON: [],
  LOST: [],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}

export class CrmService {
  constructor(
    private readonly leadRepository: LeadRepository = new LeadRepository(),
    private readonly clientRepository: ClientRepository = new ClientRepository(),
    private readonly contactRepository: ContactRepository = new ContactRepository(),
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

    if (status === 'WON') {
      throw new ConflictError('Mark a lead as won by converting it to a client');
    }
    if (lead.status === status) throw new ConflictError(`Lead is already at the ${status} stage`);
    if (!canTransitionLead(lead.status, status)) {
      throw new ConflictError(`A lead at ${lead.status} cannot move to ${status}`);
    }

    const updated = await this.leadRepository.update(id, {
      status,
      lostReason: status === 'LOST' ? lostReason : null,
    });

    await this.audit(tenantId, meta, 'LEAD_STAGE_CHANGED', 'Lead', id);
    return updated;
  }

  /** Turns a qualified lead into a client. Only reachable from PROPOSAL — the end of the funnel. */
  async convertLead(tenantId: string, id: string, input: z.infer<typeof convertLeadSchema>, meta: RequestMeta) {
    const lead = await this.requireLead(tenantId, id);

    if (lead.convertedClientId) throw new ConflictError('This lead has already been converted');
    if (lead.status === 'LOST') throw new ConflictError('A lost lead cannot be converted');
    if (lead.status !== 'PROPOSAL') {
      throw new ConflictError('Only a lead at the proposal stage can be converted to a client');
    }

    const duplicate = await this.clientRepository.findByEmail(tenantId, lead.email);
    if (duplicate) throw new ConflictError('A client with this contact email already exists');

    if (input.accountManagerId) await this.requireEmployeeInTenant(tenantId, input.accountManagerId, 'Account manager');

    const client = await this.leadRepository.convert(id, {
      tenant: { connect: { id: tenantId } },
      companyName: lead.companyName,
      contactEmail: lead.email,
      phone: lead.phone,
      industry: input.industry,
      website: input.website,
      address: input.address,
      accountManager: input.accountManagerId ? { connect: { id: input.accountManagerId } } : undefined,
      status: 'ACTIVE',
    });

    await this.audit(tenantId, meta, 'LEAD_CONVERTED', 'Lead', id);
    return client;
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

  // ---------------------------------------------------------------- clients

  async createClient(tenantId: string, input: z.infer<typeof createClientSchema>, meta: RequestMeta) {
    const existing = await this.clientRepository.findByEmail(tenantId, input.contactEmail);
    if (existing) throw new ConflictError('A client with this contact email already exists');

    if (input.accountManagerId) await this.requireEmployeeInTenant(tenantId, input.accountManagerId, 'Account manager');

    const { accountManagerId, ...rest } = input;
    const client = await this.clientRepository.create({
      tenant: { connect: { id: tenantId } },
      accountManager: accountManagerId ? { connect: { id: accountManagerId } } : undefined,
      ...rest,
    });

    await this.audit(tenantId, meta, 'CLIENT_CREATED', 'ClientPortal', client.id);
    return client;
  }

  async requireClient(tenantId: string, id: string) {
    const client = await this.clientRepository.findById(id);
    if (!client || client.tenantId !== tenantId) throw new NotFoundError('Client not found');
    return client;
  }

  async getClient(tenantId: string, id: string) {
    await this.requireClient(tenantId, id);
    return this.clientRepository.findWithDetail(id);
  }

  async updateClient(tenantId: string, id: string, input: z.infer<typeof updateClientSchema>, meta: RequestMeta) {
    await this.requireClient(tenantId, id);
    if (input.accountManagerId) await this.requireEmployeeInTenant(tenantId, input.accountManagerId, 'Account manager');

    const { accountManagerId, ...rest } = input;
    const updated = await this.clientRepository.update(id, {
      ...rest,
      accountManager:
        accountManagerId === undefined
          ? undefined
          : accountManagerId === null
            ? { disconnect: true }
            : { connect: { id: accountManagerId } },
    });

    await this.audit(tenantId, meta, 'CLIENT_UPDATED', 'ClientPortal', id);
    return updated;
  }

  async deleteClient(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireClient(tenantId, id);
    await this.clientRepository.delete(id);
    await this.audit(tenantId, meta, 'CLIENT_DELETED', 'ClientPortal', id);
  }

  async listClients(tenantId: string, query: z.infer<typeof listClientsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, CLIENT_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.clientRepository.findMany(
      tenantId,
      { status: query.status, accountManagerId: query.accountManagerId, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ---------------------------------------------------------------- contacts

  async addContact(tenantId: string, clientId: string, input: z.infer<typeof createContactSchema>, meta: RequestMeta) {
    await this.requireClient(tenantId, clientId);

    const existing = await this.contactRepository.findByClientAndEmail(clientId, input.email);
    if (existing) throw new ConflictError('This client already has a contact with that email');

    const contact = await this.contactRepository.create({
      tenant: { connect: { id: tenantId } },
      client: { connect: { id: clientId } },
      ...input,
    });

    if (input.isPrimary) await this.contactRepository.setPrimary(clientId, contact.id);

    await this.audit(tenantId, meta, 'CLIENT_UPDATED', 'ClientContact', contact.id);
    return contact;
  }

  async deleteContact(tenantId: string, id: string, meta: RequestMeta) {
    const contact = await this.contactRepository.findById(id);
    if (!contact || contact.tenantId !== tenantId) throw new NotFoundError('Contact not found');
    await this.contactRepository.delete(id);
    await this.audit(tenantId, meta, 'CLIENT_UPDATED', 'ClientContact', id);
  }

  // ---------------------------------------------------------------- activities

  async logActivity(tenantId: string, userId: string, input: z.infer<typeof logActivitySchema>, meta: RequestMeta) {
    if (input.leadId) await this.requireLead(tenantId, input.leadId);
    if (input.clientId) await this.requireClient(tenantId, input.clientId);

    const author = await this.employeeRepository.findByUserId(userId);

    const { leadId, clientId, ...rest } = input;
    const activity = await this.activityRepository.create({
      tenant: { connect: { id: tenantId } },
      lead: leadId ? { connect: { id: leadId } } : undefined,
      client: clientId ? { connect: { id: clientId } } : undefined,
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
      { leadId: query.leadId, clientId: query.clientId, type: query.type },
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
