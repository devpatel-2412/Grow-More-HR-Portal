import { randomBytes } from 'node:crypto';
import { VisitorRepository } from './visitor.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

import type { z } from 'zod';
import type { registerVisitorSchema, listVisitorsQuerySchema } from './visitor.validators.js';
const VISITOR_SORTABLE_FIELDS = ['name', 'expectedAt', 'checkInTime', 'checkOutTime', 'status'] as const;

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function generatePassCode(): string {
  return randomBytes(9).toString('base64url'); // short, URL-safe, unguessable
}

export class VisitorService {
  constructor(
    private readonly repository: VisitorRepository = new VisitorRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async register(tenantId: string, input: z.infer<typeof registerVisitorSchema>, meta: RequestMeta) {
    const host = await this.employeeRepository.findById(input.hostEmployeeId);
    if (!host || host.tenantId !== tenantId) throw new NotFoundError('Host employee not found');

    const visitor = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      hostEmployee: { connect: { id: input.hostEmployeeId } },
      name: input.name,
      email: input.email,
      phone: input.phone,
      purpose: input.purpose,
      expectedAt: input.expectedAt,
      qrPassCode: generatePassCode(),
      status: 'EXPECTED',
    });
    await this.audit(tenantId, meta, 'VISITOR_REGISTERED', visitor.id);
    return visitor;
  }

  async requireVisitor(tenantId: string, id: string) {
    const visitor = await this.repository.findById(id);
    if (!visitor || visitor.tenantId !== tenantId) throw new NotFoundError('Visitor not found');
    return visitor;
  }

  async checkIn(tenantId: string, id: string, meta: RequestMeta) {
    const visitor = await this.requireVisitor(tenantId, id);
    if (visitor.status !== 'EXPECTED') throw new ConflictError('Only an expected visitor can be checked in');

    const updated = await this.repository.update(id, { status: 'CHECKED_IN', checkInTime: new Date() });
    await this.audit(tenantId, meta, 'VISITOR_CHECKED_IN', id);
    return updated;
  }

  async checkOut(tenantId: string, id: string, meta: RequestMeta) {
    const visitor = await this.requireVisitor(tenantId, id);
    if (visitor.status !== 'CHECKED_IN') throw new ConflictError('Only a checked-in visitor can be checked out');

    const updated = await this.repository.update(id, { status: 'CHECKED_OUT', checkOutTime: new Date() });
    await this.audit(tenantId, meta, 'VISITOR_CHECKED_OUT', id);
    return updated;
  }

  async list(tenantId: string, query: z.infer<typeof listVisitorsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, VISITOR_SORTABLE_FIELDS, { field: 'expectedAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, hostEmployeeId: query.hostEmployeeId },
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
      targetType: 'Visitor',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const visitorService = new VisitorService();
