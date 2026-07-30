import { describe, it, expect, vi } from 'vitest';
import { LeaveService, computeTotalDays } from './leave.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({
  auditLogService: { record: vi.fn().mockResolvedValue(undefined) },
}));

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

describe('computeTotalDays', () => {
  it('a single-day request is 1 day', () => {
    expect(computeTotalDays(utc(2026, 0, 5), utc(2026, 0, 5), false)).toBe(1);
  });

  it('a multi-day request is an inclusive count', () => {
    expect(computeTotalDays(utc(2026, 0, 5), utc(2026, 0, 9), false)).toBe(5); // 5,6,7,8,9
  });

  it('a half-day request is always 0.5 regardless of dates', () => {
    expect(computeTotalDays(utc(2026, 0, 5), utc(2026, 0, 5), true)).toBe(0.5);
  });
});

function makeRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'leave-1',
    tenantId: 'tenant-1',
    employeeId: 'emp-1',
    managerId: 'mgr-1',
    status: 'PENDING_MANAGER',
    startDate: utc(2026, 0, 5),
    endDate: utc(2026, 0, 5),
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    findOverlapping: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1', managerId: 'mgr-1' }),
  };
  return { repository, employeeRepository };
}

describe('LeaveService.submit', () => {
  it('starts at PENDING_MANAGER when the employee has a manager', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.create.mockResolvedValue(makeRecord());
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.submit('user-1', 'tenant-1', {
      leaveType: 'CASUAL',
      startDate: utc(2026, 0, 5),
      endDate: utc(2026, 0, 5),
      isHalfDay: false,
      reason: 'Personal',
    }, {});

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_MANAGER' }));
  });

  it('skips straight to PENDING_HR when the employee has no manager', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1', managerId: null });
    repository.create.mockResolvedValue(makeRecord({ status: 'PENDING_HR', managerId: null }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.submit('user-1', 'tenant-1', {
      leaveType: 'CASUAL',
      startDate: utc(2026, 0, 5),
      endDate: utc(2026, 0, 5),
      isHalfDay: false,
      reason: 'Personal',
    }, {});

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_HR' }));
  });

  it('rejects an overlapping request', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findOverlapping.mockResolvedValue(makeRecord());
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(
      service.submit('user-1', 'tenant-1', {
        leaveType: 'CASUAL',
        startDate: utc(2026, 0, 5),
        endDate: utc(2026, 0, 5),
        isHalfDay: false,
        reason: 'Personal',
      }, {}),
    ).rejects.toThrow(ConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe('LeaveService.managerReview', () => {
  it('approving moves the request to PENDING_HR', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'mgr-1', managerId: null });
    repository.findById.mockResolvedValue(makeRecord());
    repository.update.mockResolvedValue(makeRecord({ status: 'PENDING_HR' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.managerReview('mgr-user', 'tenant-1', 'leave-1', 'APPROVED', false, {});

    expect(repository.update).toHaveBeenCalledWith('leave-1', expect.objectContaining({ status: 'PENDING_HR' }));
  });

  it('rejecting is terminal', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'mgr-1', managerId: null });
    repository.findById.mockResolvedValue(makeRecord());
    repository.update.mockResolvedValue(makeRecord({ status: 'REJECTED' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.managerReview('mgr-user', 'tenant-1', 'leave-1', 'REJECTED', false, {});

    expect(repository.update).toHaveBeenCalledWith('leave-1', expect.objectContaining({ status: 'REJECTED' }));
  });

  it('rejects a reviewer who is not the assigned manager and has no override', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ managerId: 'someone-else' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(service.managerReview('mgr-user', 'tenant-1', 'leave-1', 'APPROVED', false, {})).rejects.toThrow(ForbiddenError);
  });

  it('allows an HR-approve-permission holder to override the manager stage', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ managerId: 'someone-else' }));
    repository.update.mockResolvedValue(makeRecord({ status: 'PENDING_HR' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.managerReview('admin-user', 'tenant-1', 'leave-1', 'APPROVED', true, {});

    expect(repository.update).toHaveBeenCalledOnce();
  });

  it('rejects reviewing a request that is not at the manager stage', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ status: 'PENDING_HR' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(service.managerReview('mgr-user', 'tenant-1', 'leave-1', 'APPROVED', false, {})).rejects.toThrow(ConflictError);
  });
});

describe('LeaveService.hrReview', () => {
  it('approving a PENDING_HR request finalizes it as APPROVED', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ status: 'PENDING_HR' }));
    repository.update.mockResolvedValue(makeRecord({ status: 'APPROVED' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.hrReview('hr-user', 'tenant-1', 'leave-1', 'APPROVED', {});

    expect(repository.update).toHaveBeenCalledWith('leave-1', expect.objectContaining({ status: 'APPROVED' }));
  });

  it('rejects reviewing a request still at the manager stage', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ status: 'PENDING_MANAGER' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(service.hrReview('hr-user', 'tenant-1', 'leave-1', 'APPROVED', {})).rejects.toThrow(ConflictError);
  });
});

describe('LeaveService.cancel', () => {
  it('the owning employee can cancel a pending request', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord());
    repository.update.mockResolvedValue(makeRecord({ status: 'CANCELLED' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await service.cancel('user-1', 'tenant-1', 'leave-1', {});

    expect(repository.update).toHaveBeenCalledWith('leave-1', { status: 'CANCELLED' });
  });

  it('rejects cancelling someone else\'s request', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ employeeId: 'someone-else' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(service.cancel('user-1', 'tenant-1', 'leave-1', {})).rejects.toThrow(ForbiddenError);
  });

  it('rejects cancelling an already-approved request', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeRecord({ status: 'APPROVED' }));
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(service.cancel('user-1', 'tenant-1', 'leave-1', {})).rejects.toThrow(ConflictError);
  });

  it('rejects cancelling a request that does not exist', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(null);
    const service = new LeaveService(repository as never, employeeRepository as never);

    await expect(service.cancel('user-1', 'tenant-1', 'missing', {})).rejects.toThrow(NotFoundError);
  });
});
