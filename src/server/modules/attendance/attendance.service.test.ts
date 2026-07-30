import { describe, it, expect, vi } from 'vitest';
import { AttendanceService, computeAttendanceDerivedFields, type AttendancePolicy } from './attendance.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

const POLICY: AttendancePolicy = {
  shiftStartMinutes: 9 * 60 + 30, // 09:30
  requiredWorkMinutes: 9 * 60, // 9h
  allowedBreakMinutes: 45,
  breakOverageExtendsLogout: true,
};

function atUTC(hours: number, minutes: number): Date {
  return new Date(Date.UTC(2026, 0, 1, hours, minutes, 0));
}

function closedBreak(startH: number, startM: number, endH: number, endM: number) {
  return { id: 'b', attendanceId: 'a', breakIn: atUTC(startH, startM), breakOut: atUTC(endH, endM) };
}

describe('computeAttendanceDerivedFields — the policy math', () => {
  it('an on-time check-in has zero late minutes and logout exactly requiredWorkMinutes later', () => {
    const checkIn = atUTC(9, 30);
    const result = computeAttendanceDerivedFields(checkIn, [], POLICY);

    expect(result.lateMinutes).toBe(0);
    expect(result.overBreakMinutes).toBe(0);
    expect(result.requiredLogoutTime).toEqual(atUTC(18, 30)); // 9:30 + 9h
  });

  it('a late check-in shifts required logout 1:1 — 9:35 in -> 6:35 out', () => {
    const checkIn = atUTC(9, 35);
    const result = computeAttendanceDerivedFields(checkIn, [], POLICY);

    expect(result.lateMinutes).toBe(5);
    expect(result.requiredLogoutTime).toEqual(atUTC(18, 35));
  });

  it('a later check-in — 9:45 in -> 6:45 out', () => {
    const checkIn = atUTC(9, 45);
    const result = computeAttendanceDerivedFields(checkIn, [], POLICY);

    expect(result.lateMinutes).toBe(15);
    expect(result.requiredLogoutTime).toEqual(atUTC(18, 45));
  });

  it('break time within the 45 min allowance does not extend logout or count as overage', () => {
    const checkIn = atUTC(9, 30);
    const breaks = [closedBreak(13, 0, 13, 30)]; // 30 min, under the 45 min allowance
    const result = computeAttendanceDerivedFields(checkIn, breaks, POLICY);

    expect(result.overBreakMinutes).toBe(0);
    expect(result.requiredLogoutTime).toEqual(atUTC(18, 30));
  });

  it('break overage extends logout when the tenant policy allows it', () => {
    const checkIn = atUTC(9, 30);
    const breaks = [closedBreak(13, 0, 14, 0)]; // 60 min, 15 min over the 45 min allowance
    const result = computeAttendanceDerivedFields(checkIn, breaks, POLICY);

    expect(result.overBreakMinutes).toBe(15);
    expect(result.requiredLogoutTime).toEqual(atUTC(18, 45)); // base 18:30 + 15 min
  });

  it('break overage is flagged but does NOT extend logout when the tenant disables that', () => {
    const policy: AttendancePolicy = { ...POLICY, breakOverageExtendsLogout: false };
    const checkIn = atUTC(9, 30);
    const breaks = [closedBreak(13, 0, 14, 0)]; // 15 min over
    const result = computeAttendanceDerivedFields(checkIn, breaks, policy);

    expect(result.overBreakMinutes).toBe(15); // still flagged
    expect(result.requiredLogoutTime).toEqual(atUTC(18, 30)); // NOT extended
  });

  it('an open (still in-progress) break does not count toward overage yet', () => {
    const checkIn = atUTC(9, 30);
    const openBreak = { id: 'b', attendanceId: 'a', breakIn: atUTC(13, 0), breakOut: null };
    const result = computeAttendanceDerivedFields(checkIn, [openBreak], POLICY);

    expect(result.overBreakMinutes).toBe(0);
  });

  it('multiple breaks in a day are summed', () => {
    const checkIn = atUTC(9, 30);
    const breaks = [closedBreak(11, 0, 11, 15), closedBreak(13, 0, 13, 40)]; // 15 + 40 = 55 min total, 10 over
    const result = computeAttendanceDerivedFields(checkIn, breaks, POLICY);

    expect(result.overBreakMinutes).toBe(10);
  });
});

function makeAttendance(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'att-1',
    employeeId: 'emp-1',
    tenantId: 'tenant-1',
    date: new Date(Date.UTC(2026, 0, 1)),
    checkIn: atUTC(9, 30),
    checkOut: null,
    status: 'PRESENT',
    lateMinutes: 0,
    overBreakMinutes: 0,
    requiredLogoutTime: atUTC(18, 30),
    breaks: [],
    ...overrides,
  };
}

function makeMockDeps() {
  const repository = {
    findByEmployeeAndDate: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createBreak: vi.fn(),
    findOpenBreak: vi.fn().mockResolvedValue(null),
    closeBreak: vi.fn(),
    findManyByTenant: vi.fn(),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }),
  };
  const tenantRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'tenant-1',
      attendanceShiftStartMinutes: POLICY.shiftStartMinutes,
      attendanceRequiredWorkMinutes: POLICY.requiredWorkMinutes,
      attendanceAllowedBreakMinutes: POLICY.allowedBreakMinutes,
      attendanceBreakOverageExtendsLogout: POLICY.breakOverageExtendsLogout,
    }),
  };
  return { repository, employeeRepository, tenantRepository };
}

describe('AttendanceService.punchIn', () => {
  it('creates a record when none exists for today', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.create.mockResolvedValue(makeAttendance());
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await service.punchIn('user-1', 'tenant-1', {}, {});

    expect(repository.create).toHaveBeenCalledOnce();
  });

  it('rejects a second punch-in on the same day', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeAttendance());
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.punchIn('user-1', 'tenant-1', {}, {})).rejects.toThrow(ConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects when the account has no employee profile', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    employeeRepository.findByUserId.mockResolvedValue(null);
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.punchIn('user-1', 'tenant-1', {}, {})).rejects.toThrow(NotFoundError);
  });
});

describe('AttendanceService.punchOut', () => {
  it('rejects punch-out without a prior punch-in', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.punchOut('user-1', 'tenant-1')).rejects.toThrow(BadRequestError);
  });

  it('rejects punch-out while a break is still open', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeAttendance());
    repository.findOpenBreak.mockResolvedValue({ id: 'b1', breakOut: null });
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.punchOut('user-1', 'tenant-1')).rejects.toThrow(ConflictError);
  });

  it('rejects a second punch-out the same day', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeAttendance({ checkOut: atUTC(18, 30) }));
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.punchOut('user-1', 'tenant-1')).rejects.toThrow(ConflictError);
  });

  it('closes the day successfully when punched in with no open break', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeAttendance());
    repository.update.mockResolvedValue(makeAttendance({ checkOut: atUTC(18, 30) }));
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await service.punchOut('user-1', 'tenant-1');

    expect(repository.update).toHaveBeenCalledWith('att-1', expect.objectContaining({ checkOut: expect.any(Date) }));
  });
});

describe('AttendanceService.startBreak / endBreak', () => {
  it('rejects starting a break when one is already open', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeAttendance());
    repository.findOpenBreak.mockResolvedValue({ id: 'b1', breakOut: null });
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.startBreak('user-1')).rejects.toThrow(ConflictError);
  });

  it('rejects ending a break when none is open', async () => {
    const { repository, employeeRepository, tenantRepository } = makeMockDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeAttendance());
    repository.findOpenBreak.mockResolvedValue(null);
    const service = new AttendanceService(repository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.endBreak('user-1', 'tenant-1')).rejects.toThrow(ConflictError);
  });
});
