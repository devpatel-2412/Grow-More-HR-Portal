import { SalaryStructureRepository, PayrollRunRepository, PayrollItemRepository } from './payroll.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { calculatePayroll, round2, type PayrollPolicy } from './payroll.calculator.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import { prisma } from '../../db/prisma.js';
import type { Tenant, PayrollStatus } from '@prisma/client';
import type { z } from 'zod';
import type {
  setSalaryStructureSchema,
  listSalaryStructuresQuerySchema,
  listPayrollRunsQuerySchema,
  listPayrollItemsQuerySchema,
  updatePayrollItemSchema,
} from './payroll.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function monthRange(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/** Days of a leave request that actually fall inside the payroll month, inclusive of both ends. */
export function overlappingDays(leaveStart: Date, leaveEnd: Date, periodStart: Date, periodEnd: Date): number {
  const start = Math.max(leaveStart.getTime(), periodStart.getTime());
  const end = Math.min(leaveEnd.getTime(), periodEnd.getTime());
  if (end < start) return 0;
  return Math.floor((end - start) / MS_PER_DAY) + 1;
}

export function policyFromTenant(tenant: Tenant): PayrollPolicy {
  return {
    pfEmployeeRate: tenant.payrollPfEmployeeRate,
    pfWageCeiling: tenant.payrollPfWageCeiling,
    esicEmployeeRate: tenant.payrollEsicEmployeeRate,
    esicWageCeiling: tenant.payrollEsicWageCeiling,
    professionalTax: tenant.payrollProfessionalTax,
    tdsRate: tenant.payrollTdsRate,
    overtimeMultiplier: tenant.payrollOvertimeMultiplier,
    workingDaysPerMonth: tenant.payrollWorkingDaysPerMonth,
  };
}

export class PayrollService {
  constructor(
    private readonly structureRepository: SalaryStructureRepository = new SalaryStructureRepository(),
    private readonly runRepository: PayrollRunRepository = new PayrollRunRepository(),
    private readonly itemRepository: PayrollItemRepository = new PayrollItemRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
    private readonly tenantRepository: TenantRepository = new TenantRepository(),
  ) {}

  async setSalaryStructure(tenantId: string, input: z.infer<typeof setSalaryStructureSchema>, meta: RequestMeta) {
    const employee = await this.employeeRepository.findById(input.employeeId);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Employee not found');

    const effectiveFrom = new Date(
      Date.UTC(input.effectiveFrom.getUTCFullYear(), input.effectiveFrom.getUTCMonth(), input.effectiveFrom.getUTCDate()),
    );

    const structure = await this.structureRepository.upsert(input.employeeId, effectiveFrom, {
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: input.employeeId } },
      effectiveFrom,
      basicSalary: input.basicSalary,
      hra: input.hra,
      allowance: input.allowance,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'SALARY_STRUCTURE_SET',
      targetType: 'SalaryStructure',
      targetId: structure.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return structure;
  }

  async listSalaryStructures(tenantId: string, query: z.infer<typeof listSalaryStructuresQuerySchema>) {
    const { rows, total } = await this.structureRepository.findMany(
      tenantId,
      query.employeeId,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /**
   * Builds the month's payslips from each employee's effective salary structure, docking approved
   * unpaid leave that falls inside the period. Employees with no salary structure are skipped
   * rather than defaulted to zero pay — a missing structure is a data gap, not a zero salary.
   */
  async generateRun(tenantId: string, month: number, year: number, meta: RequestMeta) {
    const existing = await this.runRepository.findByPeriod(tenantId, month, year);
    if (existing) throw new ConflictError('A payroll run already exists for this period');

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');
    const policy = policyFromTenant(tenant);

    const { start, end } = monthRange(month, year);

    const employees = await prisma.employeeProfile.findMany({ where: { tenantId, status: 'ACTIVE' } });
    if (employees.length === 0) throw new ValidationError('No active employees to run payroll for');

    const unpaidLeaves = await prisma.leaveRequest.findMany({
      where: { tenantId, status: 'APPROVED', leaveType: 'UNPAID', startDate: { lte: end }, endDate: { gte: start } },
    });

    const unpaidDaysByEmployee = new Map<string, number>();
    for (const leave of unpaidLeaves) {
      const days = leave.isHalfDay ? 0.5 : overlappingDays(leave.startDate, leave.endDate, start, end);
      unpaidDaysByEmployee.set(leave.employeeId, (unpaidDaysByEmployee.get(leave.employeeId) ?? 0) + days);
    }

    const items = [];
    for (const employee of employees) {
      const structure = await this.structureRepository.findEffective(employee.id, end);
      if (!structure) continue;

      const breakdown = calculatePayroll(
        {
          basicSalary: structure.basicSalary,
          hra: structure.hra,
          allowance: structure.allowance,
          bonus: 0,
          overtimeHours: 0,
          unpaidLeaveDays: unpaidDaysByEmployee.get(employee.id) ?? 0,
        },
        policy,
      );

      items.push({ tenantId, employeeId: employee.id, month, year, ...breakdown, status: 'DRAFT' as const });
    }

    if (items.length === 0) {
      throw new ValidationError('No employees have a salary structure effective for this period');
    }

    const totalNet = round2(items.reduce((sum, item) => sum + item.netSalary, 0));

    const run = await this.runRepository.createWithItems(
      {
        tenant: { connect: { id: tenantId } },
        month,
        year,
        status: 'DRAFT',
        totalNet,
        itemCount: items.length,
      },
      items,
    );

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'PAYROLL_RUN_GENERATED',
      targetType: 'PayrollRun',
      targetId: run.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return run;
  }

  private async requireRun(tenantId: string, id: string) {
    const run = await this.runRepository.findById(id);
    if (!run || run.tenantId !== tenantId) throw new NotFoundError('Payroll run not found');
    return run;
  }

  async getRun(tenantId: string, id: string) {
    await this.requireRun(tenantId, id);
    return this.runRepository.findWithItems(id);
  }

  async listRuns(tenantId: string, query: z.infer<typeof listPayrollRunsQuerySchema>) {
    const { rows, total } = await this.runRepository.findMany(
      tenantId,
      { year: query.year, status: query.status },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /** DRAFT → APPROVED → PAID, with CANCELLED reachable from either non-terminal state. PAID is final. */
  async transitionRun(tenantId: string, userId: string, id: string, target: PayrollStatus, meta: RequestMeta) {
    const run = await this.requireRun(tenantId, id);

    const allowed: Record<string, PayrollStatus[]> = {
      DRAFT: ['APPROVED', 'CANCELLED'],
      APPROVED: ['PAID', 'CANCELLED'],
      PAID: [],
      CANCELLED: [],
    };
    if (!allowed[run.status].includes(target)) {
      throw new ConflictError(`A ${run.status.toLowerCase()} payroll run cannot move to ${target.toLowerCase()}`);
    }

    const updated = await this.runRepository.setStatus(id, target, userId);

    const action =
      target === 'APPROVED' ? 'PAYROLL_RUN_APPROVED' : target === 'PAID' ? 'PAYROLL_RUN_PAID' : 'PAYROLL_RUN_CANCELLED';
    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action,
      targetType: 'PayrollRun',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  /** Bonus/overtime edits are only meaningful before approval — after that the run is a financial record. */
  async updateItem(tenantId: string, id: string, input: z.infer<typeof updatePayrollItemSchema>) {
    const item = await this.itemRepository.findById(id);
    if (!item || item.tenantId !== tenantId) throw new NotFoundError('Payslip not found');
    if (item.status !== 'DRAFT') throw new ConflictError('Only a draft payslip can be edited');

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');

    const breakdown = calculatePayroll(
      {
        basicSalary: item.basicSalary,
        hra: item.hra,
        allowance: item.allowance,
        bonus: input.bonus ?? item.bonus,
        overtimeHours: input.overtimeHours ?? item.overtimeHours,
        unpaidLeaveDays: item.unpaidLeaveDays,
      },
      policyFromTenant(tenant),
    );

    const updated = await this.itemRepository.update(id, breakdown);

    // The run's headline total must stay consistent with the payslips underneath it.
    const totals = await this.itemRepository.sumRunTotals(item.payrollRunId);
    await this.runRepository.update(item.payrollRunId, {
      totalNet: round2(totals.totalNet),
      itemCount: totals.itemCount,
    });

    return updated;
  }

  async listItems(
    tenantId: string,
    requester: { userId: string; canReadTenant: boolean },
    query: z.infer<typeof listPayrollItemsQuerySchema>,
  ) {
    let employeeId = query.employeeId;

    if (!requester.canReadTenant) {
      const own = await this.employeeRepository.findByUserId(requester.userId);
      if (!own) throw new NotFoundError('No employee profile is associated with this account');
      if (employeeId && employeeId !== own.id) throw new ForbiddenError("Cannot view another employee's payslips");
      employeeId = own.id;
    }

    const { rows, total } = await this.itemRepository.findMany(
      tenantId,
      { employeeId, month: query.month, year: query.year },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const payrollService = new PayrollService();
