import { TicketRepository, TicketCommentRepository } from './ticket.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { TicketStatus } from '@prisma/client';
import type { z } from 'zod';
import type { createTicketSchema, listTicketsQuerySchema } from './ticket.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * OPEN → IN_PROGRESS → RESOLVED → CLOSED moves forward one step at a time. Reopening from
 * RESOLVED/CLOSED back to OPEN is also allowed — a fix that did not stick is common in a
 * helpdesk — but nothing else moves backward.
 */
const FORWARD: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

export function canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
  return FORWARD[from].includes(to);
}

export class TicketService {
  constructor(
    private readonly repository: TicketRepository = new TicketRepository(),
    private readonly commentRepository: TicketCommentRepository = new TicketCommentRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireOwnProfile(userId: string) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');
    return profile;
  }

  async create(tenantId: string, userId: string, input: z.infer<typeof createTicketSchema>, meta: RequestMeta) {
    const profile = await this.requireOwnProfile(userId);
    const ticket = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: profile.id } },
      ...input,
    });
    await this.audit(tenantId, meta, 'TICKET_CREATED', ticket.id);
    return ticket;
  }

  async requireTicket(tenantId: string, id: string) {
    const ticket = await this.repository.findById(id);
    if (!ticket || ticket.tenantId !== tenantId) throw new NotFoundError('Ticket not found');
    return ticket;
  }

  async getTicket(tenantId: string, userId: string, canReadTenant: boolean, id: string) {
    const ticket = await this.requireTicket(tenantId, id);
    if (!canReadTenant) {
      const profile = await this.requireOwnProfile(userId);
      if (ticket.employeeId !== profile.id && ticket.assignedToId !== profile.id) {
        throw new ForbiddenError('Cannot view a ticket that is not yours');
      }
    }
    return this.repository.findWithComments(id);
  }

  /** Only TICKET_MANAGE holders or the currently assigned agent may move the ticket forward; the reporter may reopen it. */
  async changeStatus(
    tenantId: string,
    userId: string,
    hasTicketManage: boolean,
    id: string,
    status: TicketStatus,
    meta: RequestMeta,
  ) {
    const ticket = await this.requireTicket(tenantId, id);
    if (!canTransitionTicket(ticket.status, status)) {
      throw new ConflictError(`A ${ticket.status.toLowerCase()} ticket cannot move to ${status.toLowerCase()}`);
    }

    if (!hasTicketManage) {
      const profile = await this.requireOwnProfile(userId);
      const isAssignee = ticket.assignedToId === profile.id;
      const isReopenByReporter = status === 'OPEN' && ticket.employeeId === profile.id;
      if (!isAssignee && !isReopenByReporter) {
        throw new ForbiddenError('Only the assigned agent, a ticket manager, or the reporter (to reopen) can do this');
      }
    }

    const updated = await this.repository.update(id, { status });
    await this.audit(tenantId, meta, 'TICKET_STATUS_CHANGED', id);
    return updated;
  }

  async assign(tenantId: string, id: string, assignedToId: string | null, meta: RequestMeta) {
    await this.requireTicket(tenantId, id);
    if (assignedToId) {
      const employee = await this.employeeRepository.findById(assignedToId);
      if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Assignee not found');
    }
    const updated = await this.repository.update(id, {
      assignedTo: assignedToId ? { connect: { id: assignedToId } } : { disconnect: true },
    });
    await this.audit(tenantId, meta, 'TICKET_ASSIGNED', id);
    return updated;
  }

  async addComment(tenantId: string, userId: string, canReadTenant: boolean, id: string, body: string, meta: RequestMeta) {
    const ticket = await this.requireTicket(tenantId, id);
    const profile = await this.requireOwnProfile(userId);

    if (!canReadTenant && ticket.employeeId !== profile.id && ticket.assignedToId !== profile.id) {
      throw new ForbiddenError('Cannot comment on a ticket that is not yours');
    }

    const comment = await this.commentRepository.create({
      tenant: { connect: { id: tenantId } },
      ticket: { connect: { id } },
      author: { connect: { id: profile.id } },
      body,
    });
    await this.audit(tenantId, meta, 'TICKET_COMMENTED', id);
    return comment;
  }

  async list(
    tenantId: string,
    userId: string,
    canReadTenant: boolean,
    query: z.infer<typeof listTicketsQuerySchema>,
  ) {
    let ownedByEmployeeId: string | undefined;
    if (!canReadTenant) {
      const profile = await this.requireOwnProfile(userId);
      ownedByEmployeeId = profile.id;
    }

    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, category: query.category, assignedToId: query.assignedToId, ownedByEmployeeId },
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
      targetType: 'Ticket',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const ticketService = new TicketService();
