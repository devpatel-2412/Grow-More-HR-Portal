import { LifecycleRepository } from './lifecycle.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import type { z } from 'zod';
import type {
  confirmEmployeeSchema,
  promoteEmployeeSchema,
  transferEmployeeSchema,
  initiateExitSchema,
  completeExitSchema,
} from './lifecycle.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class LifecycleService {
  constructor(
    private readonly repository: LifecycleRepository = new LifecycleRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireEmployee(tenantId: string, id: string) {
    const employee = await this.employeeRepository.findById(id);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Employee not found');
    return employee;
  }

  async listEvents(tenantId: string, employeeId: string) {
    await this.requireEmployee(tenantId, employeeId);
    return this.repository.findEventsByEmployee(employeeId);
  }

  /** Only an employee still on probation can be confirmed — everyone else already has a settled status. */
  async confirm(tenantId: string, id: string, input: z.infer<typeof confirmEmployeeSchema>, meta: RequestMeta) {
    const employee = await this.requireEmployee(tenantId, id);
    if (employee.status !== 'ONBOARDING') throw new ConflictError('Only an employee still onboarding can be confirmed');

    const { updatedEmployee } = await this.repository.recordEvent(
      tenantId,
      id,
      {
        type: 'CONFIRMATION',
        effectiveDate: input.effectiveDate,
        previousValue: employee.status,
        newValue: 'ACTIVE',
        notes: input.notes,
        createdById: meta.actorUserId,
      },
      { status: 'ACTIVE' },
    );
    await this.audit(tenantId, meta, 'EMPLOYEE_CONFIRMED', id);
    return updatedEmployee;
  }

  /** A terminal-status employee (exited, terminated) cannot be promoted — reactivation is a separate concern this module doesn't cover. */
  async promote(tenantId: string, id: string, input: z.infer<typeof promoteEmployeeSchema>, meta: RequestMeta) {
    const employee = await this.requireEmployee(tenantId, id);
    if (employee.status === 'TERMINATED' || employee.status === 'RESIGNED') {
      throw new ConflictError('Cannot promote an employee who has already exited');
    }

    const { updatedEmployee } = await this.repository.recordEvent(
      tenantId,
      id,
      {
        type: 'PROMOTION',
        effectiveDate: input.effectiveDate,
        previousValue: JSON.stringify({ designation: employee.designation, department: employee.department }),
        newValue: JSON.stringify({ designation: input.newDesignation, department: input.newDepartment ?? employee.department }),
        notes: input.notes,
        createdById: meta.actorUserId,
      },
      { designation: input.newDesignation, department: input.newDepartment },
    );
    await this.audit(tenantId, meta, 'EMPLOYEE_PROMOTED', id);
    return updatedEmployee;
  }

  async transfer(tenantId: string, id: string, input: z.infer<typeof transferEmployeeSchema>, meta: RequestMeta) {
    const employee = await this.requireEmployee(tenantId, id);
    if (employee.status === 'TERMINATED' || employee.status === 'RESIGNED') {
      throw new ConflictError('Cannot transfer an employee who has already exited');
    }

    const { updatedEmployee } = await this.repository.recordEvent(
      tenantId,
      id,
      {
        type: 'TRANSFER',
        effectiveDate: input.effectiveDate,
        previousValue: JSON.stringify({ branchId: employee.branchId, teamId: employee.teamId, managerId: employee.managerId }),
        newValue: JSON.stringify({ branchId: input.branchId, teamId: input.teamId, managerId: input.managerId }),
        notes: input.notes,
        createdById: meta.actorUserId,
      },
      {
        branch: input.branchId === undefined ? undefined : input.branchId === null ? { disconnect: true } : { connect: { id: input.branchId } },
        team: input.teamId === undefined ? undefined : input.teamId === null ? { disconnect: true } : { connect: { id: input.teamId } },
        manager: input.managerId === undefined ? undefined : input.managerId === null ? { disconnect: true } : { connect: { id: input.managerId } },
      },
    );
    await this.audit(tenantId, meta, 'EMPLOYEE_TRANSFERRED', id);
    return updatedEmployee;
  }

  /** Moves an active employee into their notice/offboarding period; the terminal outcome is recorded separately by completeExit. */
  async initiateExit(tenantId: string, id: string, input: z.infer<typeof initiateExitSchema>, meta: RequestMeta) {
    const employee = await this.requireEmployee(tenantId, id);
    if (employee.status !== 'ACTIVE') throw new ConflictError('Only an active employee can begin the exit process');

    const { updatedEmployee } = await this.repository.recordEvent(
      tenantId,
      id,
      {
        type: 'EXIT_INITIATED',
        effectiveDate: input.effectiveDate,
        previousValue: employee.status,
        newValue: 'OFFBOARDING',
        notes: input.notes ?? input.reason,
        createdById: meta.actorUserId,
      },
      { status: 'OFFBOARDING' },
    );
    await this.audit(tenantId, meta, 'EMPLOYEE_EXIT_INITIATED', id);
    return updatedEmployee;
  }

  async completeExit(tenantId: string, id: string, input: z.infer<typeof completeExitSchema>, meta: RequestMeta) {
    const employee = await this.requireEmployee(tenantId, id);
    if (employee.status !== 'OFFBOARDING') throw new ConflictError('Exit must be initiated before it can be completed');

    const { updatedEmployee } = await this.repository.recordEvent(
      tenantId,
      id,
      {
        type: 'EXIT_COMPLETED',
        effectiveDate: input.effectiveDate,
        previousValue: employee.status,
        newValue: input.outcome,
        notes: input.notes,
        createdById: meta.actorUserId,
      },
      { status: input.outcome },
    );
    await this.audit(tenantId, meta, 'EMPLOYEE_EXIT_COMPLETED', id);
    return updatedEmployee;
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
      targetType: 'EmployeeProfile',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const lifecycleService = new LifecycleService();
