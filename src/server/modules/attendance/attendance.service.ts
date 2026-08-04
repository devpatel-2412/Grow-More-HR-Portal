import { AttendanceRepository } from './attendance.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { Attendance, AttendanceBreak, Tenant } from '@prisma/client';
import type { z } from 'zod';
import type { punchInSchema, listAttendanceQuerySchema } from './attendance.validators.js';

interface RequestMeta {
  ipAddress?: string;
}

const ATTENDANCE_SORTABLE_FIELDS = ['date', 'status', 'checkIn', 'checkOut', 'lateMinutes', 'overBreakMinutes'] as const;

/** Midnight UTC for the given instant — the calendar-day key the (employeeId, date) unique constraint is built on. */
function dayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function minutesSinceMidnight(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export interface AttendancePolicy {
  shiftStartMinutes: number;
  requiredWorkMinutes: number;
  allowedBreakMinutes: number;
  breakOverageExtendsLogout: boolean;
}

function policyFromTenant(tenant: Tenant): AttendancePolicy {
  return {
    shiftStartMinutes: tenant.attendanceShiftStartMinutes,
    requiredWorkMinutes: tenant.attendanceRequiredWorkMinutes,
    allowedBreakMinutes: tenant.attendanceAllowedBreakMinutes,
    breakOverageExtendsLogout: tenant.attendanceBreakOverageExtendsLogout,
  };
}

/** Sums closed breaks only — an open break doesn't count against the allowance until it ends. */
function totalClosedBreakMinutes(breaks: AttendanceBreak[]): number {
  return breaks.reduce((total, b) => {
    if (!b.breakOut) return total;
    return total + Math.round((b.breakOut.getTime() - b.breakIn.getTime()) / 60000);
  }, 0);
}

/**
 * The core policy math: a late check-in shifts the required logout time 1:1 (checkIn 9:35 with a
 * 9h window → logout required at 6:35). Break time beyond the allowance either pushes the logout
 * time further out, or — if the tenant disables that — is left as a flagged overage with no
 * extension, per `breakOverageExtendsLogout`.
 */
export function computeAttendanceDerivedFields(
  checkIn: Date,
  breaks: AttendanceBreak[],
  policy: AttendancePolicy,
): { lateMinutes: number; overBreakMinutes: number; requiredLogoutTime: Date } {
  const lateMinutes = Math.max(0, minutesSinceMidnight(checkIn) - policy.shiftStartMinutes);
  const totalBreakMinutes = totalClosedBreakMinutes(breaks);
  const overBreakMinutes = Math.max(0, totalBreakMinutes - policy.allowedBreakMinutes);

  const baseLogoutMs = checkIn.getTime() + policy.requiredWorkMinutes * 60000;
  const extensionMs = policy.breakOverageExtendsLogout ? overBreakMinutes * 60000 : 0;

  return {
    lateMinutes,
    overBreakMinutes,
    requiredLogoutTime: new Date(baseLogoutMs + extensionMs),
  };
}

export class AttendanceService {
  constructor(
    private readonly repository: AttendanceRepository = new AttendanceRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
    private readonly tenantRepository: TenantRepository = new TenantRepository(),
  ) {}

  private async requireEmployeeProfile(userId: string) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');
    return profile;
  }

  private async requirePolicy(tenantId: string): Promise<AttendancePolicy> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');
    return policyFromTenant(tenant);
  }

  async punchIn(userId: string, tenantId: string, input: z.infer<typeof punchInSchema>, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);
    const policy = await this.requirePolicy(tenantId);
    const now = new Date();
    const today = dayStart(now);

    const existing = await this.repository.findByEmployeeAndDate(profile.id, today);
    if (existing) throw new ConflictError('Already punched in today');

    const { lateMinutes, requiredLogoutTime } = computeAttendanceDerivedFields(now, [], policy);

    return this.repository.create({
      employee: { connect: { id: profile.id } },
      tenant: { connect: { id: tenantId } },
      date: today,
      checkIn: now,
      status: lateMinutes > 0 ? 'LATE' : 'PRESENT',
      lateMinutes,
      requiredLogoutTime,
      gpsCoordinates: input.gpsCoordinates,
      deviceType: input.deviceType,
      ipAddress: meta.ipAddress,
    });
  }

  async punchOut(userId: string, tenantId: string) {
    const attendance = await this.getTodayOrThrow(userId);
    const openBreak = await this.repository.findOpenBreak(attendance.id);
    if (openBreak) throw new ConflictError('End your current break before punching out');
    if (attendance.checkOut) throw new ConflictError('Already punched out today');

    const policy = await this.requirePolicy(tenantId);
    const now = new Date();
    const { overBreakMinutes, requiredLogoutTime } = computeAttendanceDerivedFields(attendance.checkIn, attendance.breaks, policy);

    return this.repository.update(attendance.id, {
      checkOut: now,
      overBreakMinutes,
      requiredLogoutTime,
    });
  }

  async startBreak(userId: string) {
    const attendance = await this.getTodayOrThrow(userId);
    if (attendance.checkOut) throw new ConflictError('Already punched out today');
    const openBreak = await this.repository.findOpenBreak(attendance.id);
    if (openBreak) throw new ConflictError('A break is already in progress');

    await this.repository.createBreak(attendance.id, new Date());
    return this.repository.findById(attendance.id);
  }

  async endBreak(userId: string, tenantId: string) {
    const attendance = await this.getTodayOrThrow(userId);
    const openBreak = await this.repository.findOpenBreak(attendance.id);
    if (!openBreak) throw new ConflictError('No break is currently in progress');

    await this.repository.closeBreak(openBreak.id, new Date());
    const refreshed = await this.repository.findById(attendance.id);
    if (!refreshed) throw new NotFoundError('Attendance record not found');

    const policy = await this.requirePolicy(tenantId);
    const { overBreakMinutes, requiredLogoutTime } = computeAttendanceDerivedFields(refreshed.checkIn, refreshed.breaks, policy);

    return this.repository.update(attendance.id, { overBreakMinutes, requiredLogoutTime });
  }

  private async getTodayOrThrow(userId: string) {
    const profile = await this.requireEmployeeProfile(userId);
    const today = dayStart(new Date());
    const attendance = await this.repository.findByEmployeeAndDate(profile.id, today);
    if (!attendance) throw new BadRequestError('Punch in before performing this action');
    return attendance;
  }

  async getToday(userId: string, tenantId: string) {
    const profile = await this.requireEmployeeProfile(userId);
    const today = dayStart(new Date());
    const attendance = await this.repository.findByEmployeeAndDate(profile.id, today);
    if (!attendance) return null;

    const policy = await this.requirePolicy(tenantId);
    const openBreak = attendance.breaks.find((b) => !b.breakOut) ?? null;
    const derived = computeAttendanceDerivedFields(attendance.checkIn, attendance.breaks, policy);

    return {
      ...attendance,
      onBreak: !!openBreak,
      // Live-recomputed so the countdown reflects "now", not just the last write.
      liveRequiredLogoutTime: attendance.checkOut ? attendance.requiredLogoutTime : derived.requiredLogoutTime,
      liveOverBreakMinutes: derived.overBreakMinutes,
    };
  }

  async getById(tenantId: string, id: string) {
    const attendance = await this.repository.findById(id);
    if (!attendance || attendance.tenantId !== tenantId) throw new NotFoundError('Attendance record not found');
    return attendance;
  }

  async list(tenantId: string, requester: { userId: string; tenantId: string; canReadTenant: boolean }, query: z.infer<typeof listAttendanceQuerySchema>) {
    let employeeId = query.employeeId;

    if (employeeId) {
      if (!requester.canReadTenant) {
        const own = await this.employeeRepository.findByUserId(requester.userId);
        if (!own || own.id !== employeeId) throw new ForbiddenError('Cannot view another employee\'s attendance');
      }
    } else if (!requester.canReadTenant) {
      const own = await this.employeeRepository.findByUserId(requester.userId);
      if (!own) throw new NotFoundError('No employee profile is associated with this account');
      employeeId = own.id;
    }

    const orderBy = toPrismaOrderBy(query.sort, ATTENDANCE_SORTABLE_FIELDS, { field: 'date', direction: 'desc' });
    const { rows, total } = await this.repository.findManyByTenant(
      tenantId,
      { employeeId, from: query.from, to: query.to },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const attendanceService = new AttendanceService();
export type { Attendance };
