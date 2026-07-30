import { RegularizationRepository } from './regularization.repository.js';
import { AttendanceRepository } from './attendance.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { computeAttendanceDerivedFields, type AttendancePolicy } from './attendance.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { RegularizationStatus, Tenant } from '@prisma/client';
import type { z } from 'zod';
import type { requestRegularizationSchema, listRegularizationsQuerySchema } from './attendance.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function policyFromTenant(tenant: Tenant): AttendancePolicy {
  return {
    shiftStartMinutes: tenant.attendanceShiftStartMinutes,
    requiredWorkMinutes: tenant.attendanceRequiredWorkMinutes,
    allowedBreakMinutes: tenant.attendanceAllowedBreakMinutes,
    breakOverageExtendsLogout: tenant.attendanceBreakOverageExtendsLogout,
  };
}

function dayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export class RegularizationService {
  constructor(
    private readonly repository: RegularizationRepository = new RegularizationRepository(),
    private readonly attendanceRepository: AttendanceRepository = new AttendanceRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
    private readonly tenantRepository: TenantRepository = new TenantRepository(),
  ) {}

  async request(userId: string, tenantId: string, input: z.infer<typeof requestRegularizationSchema>, meta: RequestMeta) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');

    const record = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: profile.id } },
      date: dayStart(input.date),
      requestedCheckIn: input.requestedCheckIn,
      requestedCheckOut: input.requestedCheckOut,
      reason: input.reason,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'ATTENDANCE_REGULARIZATION_REQUESTED',
      targetType: 'AttendanceRegularization',
      targetId: record.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  }

  async list(tenantId: string, requester: { userId: string; canReadTenant: boolean }, query: z.infer<typeof listRegularizationsQuerySchema>) {
    let employeeId: string | undefined;
    if (!requester.canReadTenant) {
      const own = await this.employeeRepository.findByUserId(requester.userId);
      if (!own) throw new NotFoundError('No employee profile is associated with this account');
      employeeId = own.id;
    }

    const { rows, total } = await this.repository.findMany(
      tenantId,
      { employeeId, status: query.status },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async review(tenantId: string, id: string, status: Extract<RegularizationStatus, 'APPROVED' | 'REJECTED'>, meta: RequestMeta) {
    const request = await this.repository.findById(id);
    if (!request || request.tenantId !== tenantId) throw new NotFoundError('Regularization request not found');
    if (request.status !== 'PENDING') throw new ConflictError('This request has already been reviewed');

    if (status === 'APPROVED') {
      await this.applyApproval(tenantId, request);
    }

    const updated = await this.repository.update(id, {
      status,
      reviewedById: meta.actorUserId,
      reviewedAt: new Date(),
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: status === 'APPROVED' ? 'ATTENDANCE_REGULARIZATION_APPROVED' : 'ATTENDANCE_REGULARIZATION_REJECTED',
      targetType: 'AttendanceRegularization',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  /** Approval upserts the underlying Attendance row for that day, then recomputes late/break/logout fields. */
  private async applyApproval(tenantId: string, request: { employeeId: string; date: Date; requestedCheckIn: Date | null; requestedCheckOut: Date | null }) {
    if (!request.requestedCheckIn && !request.requestedCheckOut) {
      throw new BadRequestError('Regularization request has no requested times to apply');
    }

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');
    const policy = policyFromTenant(tenant);

    const existing = await this.attendanceRepository.findByEmployeeAndDate(request.employeeId, request.date);
    const checkIn = request.requestedCheckIn ?? existing?.checkIn;
    if (!checkIn) {
      throw new BadRequestError('Cannot approve a check-out-only request when no check-in exists for that day');
    }
    const checkOut = request.requestedCheckOut ?? existing?.checkOut ?? null;

    const derived = computeAttendanceDerivedFields(checkIn, existing?.breaks ?? [], policy);

    if (existing) {
      await this.attendanceRepository.update(existing.id, {
        checkIn,
        checkOut,
        lateMinutes: derived.lateMinutes,
        overBreakMinutes: derived.overBreakMinutes,
        requiredLogoutTime: derived.requiredLogoutTime,
        status: derived.lateMinutes > 0 ? 'LATE' : 'PRESENT',
      });
    } else {
      await this.attendanceRepository.create({
        employee: { connect: { id: request.employeeId } },
        tenant: { connect: { id: tenantId } },
        date: request.date,
        checkIn,
        checkOut,
        lateMinutes: derived.lateMinutes,
        requiredLogoutTime: derived.requiredLogoutTime,
        status: derived.lateMinutes > 0 ? 'LATE' : 'PRESENT',
      });
    }
  }
}

export const regularizationService = new RegularizationService();
