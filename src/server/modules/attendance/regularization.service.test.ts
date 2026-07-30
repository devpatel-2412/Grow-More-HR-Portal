import { describe, it, expect, vi } from 'vitest';
import { RegularizationService } from './regularization.service.js';
import { ConflictError, BadRequestError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({
  auditLogService: { record: vi.fn().mockResolvedValue(undefined) },
}));

const POLICY_TENANT = {
  id: 'tenant-1',
  attendanceShiftStartMinutes: 9 * 60 + 30,
  attendanceRequiredWorkMinutes: 9 * 60,
  attendanceAllowedBreakMinutes: 45,
  attendanceBreakOverageExtendsLogout: true,
};

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  };
  const attendanceRepository = {
    findByEmployeeAndDate: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'att-new' }),
    update: vi.fn().mockResolvedValue({ id: 'att-existing' }),
  };
  const employeeRepository = { findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }) };
  const tenantRepository = { findById: vi.fn().mockResolvedValue(POLICY_TENANT) };
  return { repository, attendanceRepository, employeeRepository, tenantRepository };
}

describe('RegularizationService.review', () => {
  it('rejects reviewing a request that was already reviewed', async () => {
    const { repository, attendanceRepository, employeeRepository, tenantRepository } = makeDeps();
    repository.findById.mockResolvedValue({ id: 'reg-1', tenantId: 'tenant-1', status: 'APPROVED' });
    const service = new RegularizationService(repository as never, attendanceRepository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.review('tenant-1', 'reg-1', 'APPROVED', {})).rejects.toThrow(ConflictError);
  });

  it('rejecting a pending request just updates status, no attendance mutation', async () => {
    const { repository, attendanceRepository, employeeRepository, tenantRepository } = makeDeps();
    repository.findById.mockResolvedValue({ id: 'reg-1', tenantId: 'tenant-1', status: 'PENDING' });
    repository.update.mockResolvedValue({ id: 'reg-1', status: 'REJECTED' });
    const service = new RegularizationService(repository as never, attendanceRepository as never, employeeRepository as never, tenantRepository as never);

    await service.review('tenant-1', 'reg-1', 'REJECTED', {});

    expect(attendanceRepository.create).not.toHaveBeenCalled();
    expect(attendanceRepository.update).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith('reg-1', expect.objectContaining({ status: 'REJECTED' }));
  });

  it('approving with no existing attendance and only a requested check-out throws (nothing to anchor the day to)', async () => {
    const { repository, attendanceRepository, employeeRepository, tenantRepository } = makeDeps();
    repository.findById.mockResolvedValue({
      id: 'reg-1',
      tenantId: 'tenant-1',
      status: 'PENDING',
      employeeId: 'emp-1',
      date: new Date('2026-01-01T00:00:00Z'),
      requestedCheckIn: null,
      requestedCheckOut: new Date('2026-01-01T18:30:00Z'),
    });
    const service = new RegularizationService(repository as never, attendanceRepository as never, employeeRepository as never, tenantRepository as never);

    await expect(service.review('tenant-1', 'reg-1', 'APPROVED', {})).rejects.toThrow(BadRequestError);
  });

  it('approving with a requested check-in creates a new Attendance row when none existed', async () => {
    const { repository, attendanceRepository, employeeRepository, tenantRepository } = makeDeps();
    repository.findById.mockResolvedValue({
      id: 'reg-1',
      tenantId: 'tenant-1',
      status: 'PENDING',
      employeeId: 'emp-1',
      date: new Date('2026-01-01T00:00:00Z'),
      requestedCheckIn: new Date('2026-01-01T09:30:00Z'),
      requestedCheckOut: new Date('2026-01-01T18:30:00Z'),
    });
    repository.update.mockResolvedValue({ id: 'reg-1', status: 'APPROVED' });
    const service = new RegularizationService(repository as never, attendanceRepository as never, employeeRepository as never, tenantRepository as never);

    await service.review('tenant-1', 'reg-1', 'APPROVED', {});

    expect(attendanceRepository.create).toHaveBeenCalledOnce();
    expect(repository.update).toHaveBeenCalledWith('reg-1', expect.objectContaining({ status: 'APPROVED' }));
  });

  it('approving when an Attendance row already exists updates it instead of creating a duplicate', async () => {
    const { repository, attendanceRepository, employeeRepository, tenantRepository } = makeDeps();
    attendanceRepository.findByEmployeeAndDate.mockResolvedValue({
      id: 'att-existing',
      checkIn: new Date('2026-01-01T09:45:00Z'),
      checkOut: null,
      breaks: [],
    });
    repository.findById.mockResolvedValue({
      id: 'reg-1',
      tenantId: 'tenant-1',
      status: 'PENDING',
      employeeId: 'emp-1',
      date: new Date('2026-01-01T00:00:00Z'),
      requestedCheckIn: new Date('2026-01-01T09:30:00Z'), // corrects the late check-in
      requestedCheckOut: null,
    });
    repository.update.mockResolvedValue({ id: 'reg-1', status: 'APPROVED' });
    const service = new RegularizationService(repository as never, attendanceRepository as never, employeeRepository as never, tenantRepository as never);

    await service.review('tenant-1', 'reg-1', 'APPROVED', {});

    expect(attendanceRepository.create).not.toHaveBeenCalled();
    expect(attendanceRepository.update).toHaveBeenCalledWith(
      'att-existing',
      expect.objectContaining({ lateMinutes: 0 }), // 9:30 corrected check-in, no longer late
    );
  });
});
