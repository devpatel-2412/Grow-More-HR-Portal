import { ChecklistRepository } from './checklist.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import type { z } from 'zod';
import type { createChecklistItemSchema, updateChecklistItemSchema } from './checklist.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ChecklistService {
  constructor(
    private readonly repository: ChecklistRepository = new ChecklistRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireEmployeeInTenant(tenantId: string, employeeId: string) {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Employee not found');
    return employee;
  }

  /** Own checklist is readable by the employee themselves; anyone else's needs EMPLOYEE_UPDATE, checked by the caller. */
  private async requireCanView(tenantId: string, employeeId: string, requester: { userId: string; canManage: boolean }) {
    const employee = await this.requireEmployeeInTenant(tenantId, employeeId);
    if (requester.canManage) return employee;
    const own = await this.employeeRepository.findByUserId(requester.userId);
    if (own?.id !== employeeId) throw new ForbiddenError("Cannot view another employee's checklist");
    return employee;
  }

  async list(tenantId: string, employeeId: string, requester: { userId: string; canManage: boolean }) {
    await this.requireCanView(tenantId, employeeId, requester);
    return this.repository.findByEmployee(employeeId);
  }

  async create(tenantId: string, employeeId: string, input: z.infer<typeof createChecklistItemSchema>, meta: RequestMeta) {
    await this.requireEmployeeInTenant(tenantId, employeeId);
    const item = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: employeeId } },
      label: input.label,
    });
    await this.audit(tenantId, meta, 'CHECKLIST_ITEM_CREATED', item.id);
    return item;
  }

  async update(tenantId: string, itemId: string, input: z.infer<typeof updateChecklistItemSchema>, meta: RequestMeta) {
    const item = await this.repository.findById(itemId);
    if (!item || item.tenantId !== tenantId) throw new NotFoundError('Checklist item not found');

    const updated = await this.repository.update(itemId, {
      label: input.label,
      isCompleted: input.isCompleted,
      completedAt: input.isCompleted === undefined ? undefined : input.isCompleted ? new Date() : null,
    });
    await this.audit(tenantId, meta, 'CHECKLIST_ITEM_UPDATED', itemId);
    return updated;
  }

  async delete(tenantId: string, itemId: string, meta: RequestMeta) {
    const item = await this.repository.findById(itemId);
    if (!item || item.tenantId !== tenantId) throw new NotFoundError('Checklist item not found');

    await this.repository.delete(itemId);
    await this.audit(tenantId, meta, 'CHECKLIST_ITEM_DELETED', itemId);
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
      targetType: 'OnboardingChecklistItem',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const checklistService = new ChecklistService();
