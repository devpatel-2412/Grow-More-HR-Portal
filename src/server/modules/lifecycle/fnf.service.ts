import { FnfRepository } from './fnf.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import type { FnfStatus } from '@prisma/client';
import type { z } from 'zod';
import type { upsertFnfSettlementSchema } from './fnf.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Forward-only, matching the ticket/candidate state-machine convention used elsewhere in this codebase. */
const FNF_FORWARD: Record<FnfStatus, FnfStatus[]> = {
  DRAFT: ['APPROVED'],
  APPROVED: ['PAID'],
  PAID: [],
};

function netPayable(input: { pendingSalary: number; leaveEncashment: number; bonus: number; deductions: number }) {
  return input.pendingSalary + input.leaveEncashment + input.bonus - input.deductions;
}

export class FnfService {
  constructor(
    private readonly repository: FnfRepository = new FnfRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireEmployee(tenantId: string, id: string) {
    const employee = await this.employeeRepository.findById(id);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Employee not found');
    return employee;
  }

  async get(tenantId: string, employeeId: string) {
    await this.requireEmployee(tenantId, employeeId);
    const settlement = await this.repository.findByEmployee(employeeId);
    if (!settlement) throw new NotFoundError('No F&F settlement exists for this employee yet');
    return settlement;
  }

  /** Only makes sense once the exit process has started — an active employee has nothing to settle yet. */
  async create(tenantId: string, employeeId: string, input: z.infer<typeof upsertFnfSettlementSchema>, meta: RequestMeta) {
    const employee = await this.requireEmployee(tenantId, employeeId);
    if (employee.status === 'ACTIVE' || employee.status === 'ONBOARDING') {
      throw new ConflictError('An F&F settlement can only be created once the exit process has begun');
    }
    const existing = await this.repository.findByEmployee(employeeId);
    if (existing) throw new ConflictError('An F&F settlement already exists for this employee — use update instead');

    const settlement = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: employeeId } },
      lastWorkingDay: input.lastWorkingDay,
      pendingSalary: input.pendingSalary,
      leaveEncashment: input.leaveEncashment,
      bonus: input.bonus,
      deductions: input.deductions,
      netPayable: netPayable(input),
      notes: input.notes,
    });
    await this.audit(tenantId, meta, 'FNF_SETTLEMENT_CREATED', settlement.id);
    return settlement;
  }

  /** Figures can only be edited while still in DRAFT — once approved, the numbers are the record of what was promised. */
  async update(tenantId: string, employeeId: string, input: z.infer<typeof upsertFnfSettlementSchema>, meta: RequestMeta) {
    await this.requireEmployee(tenantId, employeeId);
    const existing = await this.repository.findByEmployee(employeeId);
    if (!existing) throw new NotFoundError('No F&F settlement exists for this employee yet');
    if (existing.status !== 'DRAFT') throw new ConflictError('Only a draft settlement can be edited');

    const settlement = await this.repository.update(employeeId, {
      lastWorkingDay: input.lastWorkingDay,
      pendingSalary: input.pendingSalary,
      leaveEncashment: input.leaveEncashment,
      bonus: input.bonus,
      deductions: input.deductions,
      netPayable: netPayable(input),
      notes: input.notes,
    });
    await this.audit(tenantId, meta, 'FNF_SETTLEMENT_UPDATED', settlement.id);
    return settlement;
  }

  async changeStatus(tenantId: string, employeeId: string, status: FnfStatus, meta: RequestMeta) {
    await this.requireEmployee(tenantId, employeeId);
    const existing = await this.repository.findByEmployee(employeeId);
    if (!existing) throw new NotFoundError('No F&F settlement exists for this employee yet');
    if (!FNF_FORWARD[existing.status].includes(status)) {
      throw new ConflictError(`Cannot move a ${existing.status.toLowerCase()} settlement to ${status.toLowerCase()}`);
    }

    const settlement = await this.repository.update(employeeId, { status });
    await this.audit(tenantId, meta, 'FNF_SETTLEMENT_UPDATED', settlement.id);
    return settlement;
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
      targetType: 'FnfSettlement',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const fnfService = new FnfService();
