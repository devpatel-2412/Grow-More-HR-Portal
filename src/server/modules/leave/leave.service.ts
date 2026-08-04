import { LeaveRepository, type LeaveFilter } from './leave.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import { prisma } from '../../db/prisma.js';
import type { z } from 'zod';
import type { submitLeaveSchema, listLeaveQuerySchema } from './leave.validators.js';

const LEAVE_SORTABLE_FIELDS = ['startDate', 'endDate', 'status', 'leaveType', 'totalDays', 'createdAt'] as const;

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function computeTotalDays(startDate: Date, endDate: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  const start = dayStart(startDate);
  const end = dayStart(endDate);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

export class LeaveService {
  constructor(
    private readonly repository: LeaveRepository = new LeaveRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireEmployeeProfile(userId: string) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');
    return profile;
  }

  async submit(userId: string, tenantId: string, input: z.infer<typeof submitLeaveSchema>, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);

    const overlapping = await this.repository.findOverlapping(profile.id, input.startDate, input.endDate);
    if (overlapping) throw new ConflictError('You already have a leave request covering part of this date range');

    const totalDays = computeTotalDays(input.startDate, input.endDate, input.isHalfDay);
    const initialStatus = profile.managerId ? 'PENDING_MANAGER' : 'PENDING_HR';

    const record = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: profile.id } },
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
      totalDays,
      reason: input.reason,
      status: initialStatus,
      manager: profile.managerId ? { connect: { id: profile.managerId } } : undefined,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'LEAVE_REQUESTED',
      targetType: 'LeaveRequest',
      targetId: record.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  }

  async cancel(userId: string, tenantId: string, id: string, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Leave request not found');
    if (record.employeeId !== profile.id) throw new ForbiddenError('You can only cancel your own leave requests');
    if (record.status !== 'PENDING_MANAGER' && record.status !== 'PENDING_HR') {
      throw new ConflictError('Only a pending leave request can be cancelled');
    }

    const updated = await this.repository.update(id, { status: 'CANCELLED' });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'LEAVE_CANCELLED',
      targetType: 'LeaveRequest',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  async managerReview(
    userId: string,
    tenantId: string,
    id: string,
    status: 'APPROVED' | 'REJECTED',
    hasOverride: boolean,
    meta: RequestMeta,
  ) {
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Leave request not found');
    if (record.status !== 'PENDING_MANAGER') throw new ConflictError('This request is not awaiting manager review');

    if (!hasOverride) {
      const profile = await this.requireEmployeeProfile(userId);
      if (record.managerId !== profile.id) throw new ForbiddenError('You are not the assigned manager for this request');
    }

    const nextStatus = status === 'APPROVED' ? 'PENDING_HR' : 'REJECTED';
    const updated = await this.repository.update(id, {
      status: nextStatus,
      managerApprovedById: userId,
      managerReviewedAt: new Date(),
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: status === 'APPROVED' ? 'LEAVE_MANAGER_APPROVED' : 'LEAVE_MANAGER_REJECTED',
      targetType: 'LeaveRequest',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // A manager rejection is terminal (no HR stage follows); an approval just moves the
    // request on to HR, so it isn't a final outcome worth notifying the employee about yet.
    if (status === 'REJECTED') {
      await this.notifyEmployeeOfDecision(tenantId, record.employeeId, 'REJECTED');
    }

    return updated;
  }

  private async notifyEmployeeOfDecision(tenantId: string, employeeId: string, status: 'APPROVED' | 'REJECTED') {
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) return;
    await notificationService.notify({
      tenantId,
      userId: employee.userId,
      type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      title: status === 'APPROVED' ? 'Leave request approved' : 'Leave request rejected',
      body: status === 'APPROVED' ? 'Your leave request has been approved.' : 'Your leave request has been rejected.',
      link: '/leave',
    });
  }

  async hrReview(userId: string, tenantId: string, id: string, status: 'APPROVED' | 'REJECTED', meta: RequestMeta) {
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Leave request not found');
    if (record.status !== 'PENDING_HR') throw new ConflictError('This request is not awaiting HR review');

    const updated = await this.repository.update(id, {
      status,
      hrApprovedById: userId,
      hrReviewedAt: new Date(),
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: status === 'APPROVED' ? 'LEAVE_HR_APPROVED' : 'LEAVE_HR_REJECTED',
      targetType: 'LeaveRequest',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.notifyEmployeeOfDecision(tenantId, record.employeeId, status);

    return updated;
  }

  async getById(tenantId: string, id: string, requester: { userId: string; canReadTenant: boolean }) {
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Leave request not found');

    if (!requester.canReadTenant) {
      const profile = await this.employeeRepository.findByUserId(requester.userId);
      const isOwner = profile?.id === record.employeeId;
      const isAssignedManager = profile?.id === record.managerId;
      if (!isOwner && !isAssignedManager) {
        throw new ForbiddenError('Cannot view another employee\'s leave request');
      }
    }

    return record;
  }

  async list(
    tenantId: string,
    requester: { userId: string; canReadTenant: boolean },
    query: z.infer<typeof listLeaveQuerySchema>,
  ) {
    let employeeId = query.employeeId;

    if (employeeId) {
      if (!requester.canReadTenant) {
        const own = await this.employeeRepository.findByUserId(requester.userId);
        if (!own || own.id !== employeeId) throw new ForbiddenError("Cannot view another employee's leave requests");
      }
    } else if (!requester.canReadTenant) {
      const own = await this.employeeRepository.findByUserId(requester.userId);
      if (!own) throw new NotFoundError('No employee profile is associated with this account');
      employeeId = own.id;
    }

    const filter: LeaveFilter = {
      employeeId,
      status: query.status,
      leaveType: query.leaveType,
      from: query.from,
      to: query.to,
    };
    const orderBy = toPrismaOrderBy(query.sort, LEAVE_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(tenantId, filter, orderBy, (query.page - 1) * query.limit, query.limit);
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /** Requests awaiting the caller's own review: their direct reports' PENDING_MANAGER requests, plus PENDING_HR tenant-wide if they hold HR-approve permission. */
  async listApprovalQueue(tenantId: string, userId: string, canApproveHr: boolean, page: number, limit: number) {
    const profile = await this.employeeRepository.findByUserId(userId);

    const where = {
      tenantId,
      OR: [
        profile ? { managerId: profile.id, status: 'PENDING_MANAGER' as const } : undefined,
        canApproveHr ? { status: 'PENDING_HR' as const } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => !!clause),
    };

    if (where.OR.length === 0) {
      return { rows: [], meta: buildPaginationMeta(page, limit, 0) };
    }

    const [rows, total] = await Promise.all([
      prisma.leaveRequest.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.leaveRequest.count({ where }),
    ]);

    return { rows, meta: buildPaginationMeta(page, limit, total) };
  }
}

export const leaveService = new LeaveService();
