import { describe, it, expect, vi } from 'vitest';
import { WorkReportService, toDateOnly } from './workreport.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeReport(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wr-1',
    tenantId: 'tenant-1',
    employeeId: 'emp-1',
    date: new Date('2026-07-29T00:00:00.000Z'),
    status: 'PENDING',
    completedTasks: ['Shipped the login page'],
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmployeeAndDate: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeReport(), id, ...data })),
    findMany: vi.fn(),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1', managerId: 'mgr-1' }),
    findById: vi.fn(),
  };
  return { repository, employeeRepository };
}

const submitInput = {
  date: new Date('2026-07-29T13:45:00.000Z'),
  completedTasks: ['Shipped the login page'],
  pendingTasks: [],
  tomorrowPlan: [],
  timeSpentMinutes: 480,
};

describe('toDateOnly', () => {
  it('strips the time component so one-report-per-day holds regardless of submit time', () => {
    expect(toDateOnly(new Date('2026-07-29T23:59:00.000Z')).toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });
});

describe('WorkReportService.submit', () => {
  it('rejects a second report for the same date', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findByEmployeeAndDate.mockResolvedValue(makeReport());
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.submit('user-1', 'tenant-1', submitInput, {})).rejects.toThrow(ConflictError);
  });

  it('normalises the date before persisting', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.create.mockResolvedValue(makeReport());
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await service.submit('user-1', 'tenant-1', submitInput, {});

    const created = repository.create.mock.calls[0][0];
    expect(created.date.toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });

  it('fails when the account has no employee profile', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue(null);
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.submit('user-1', 'tenant-1', submitInput, {})).rejects.toThrow(NotFoundError);
  });
});

describe('WorkReportService.update', () => {
  it('blocks editing once the report has been reviewed', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ status: 'APPROVED' }));
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.update('user-1', 'tenant-1', 'wr-1', { issues: 'oops' }, {})).rejects.toThrow(ConflictError);
  });

  it("blocks editing another employee's report", async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ employeeId: 'emp-other' }));
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.update('user-1', 'tenant-1', 'wr-1', { issues: 'oops' }, {})).rejects.toThrow(ForbiddenError);
  });

  it('allows the author to edit while still pending', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport());
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await service.update('user-1', 'tenant-1', 'wr-1', { timeSpentMinutes: 500 }, {});

    expect(repository.update).toHaveBeenCalledWith('wr-1', { timeSpentMinutes: 500 });
  });
});

describe('WorkReportService.review', () => {
  it('refuses to let anyone review their own report, even with the permission', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ employeeId: 'emp-1' }));
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1' });
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.review('user-1', 'tenant-1', 'wr-1', { status: 'APPROVED' }, true, {})).rejects.toThrow(ForbiddenError);
  });

  it("lets the author's own manager review without holding the permission", async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ employeeId: 'emp-2' }));
    employeeRepository.findByUserId.mockResolvedValue({ id: 'mgr-1' });
    employeeRepository.findById.mockResolvedValue({ id: 'emp-2', managerId: 'mgr-1' });
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await service.review('mgr-user', 'tenant-1', 'wr-1', { status: 'APPROVED' }, false, {});

    expect(repository.update).toHaveBeenCalledWith(
      'wr-1',
      expect.objectContaining({ status: 'APPROVED', reviewedBy: { connect: { id: 'mgr-1' } } }),
    );
  });

  it('blocks an unrelated employee from reviewing', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ employeeId: 'emp-2' }));
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-3' });
    employeeRepository.findById.mockResolvedValue({ id: 'emp-2', managerId: 'mgr-1' });
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.review('other-user', 'tenant-1', 'wr-1', { status: 'APPROVED' }, false, {})).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('rejects reviewing an already-reviewed report', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ status: 'REJECTED', employeeId: 'emp-2' }));
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.review('mgr-user', 'tenant-1', 'wr-1', { status: 'APPROVED' }, true, {})).rejects.toThrow(
      ConflictError,
    );
  });

  it('404s across tenants rather than leaking existence', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeReport({ tenantId: 'tenant-other' }));
    const service = new WorkReportService(repository as never, employeeRepository as never);

    await expect(service.review('mgr-user', 'tenant-1', 'wr-1', { status: 'APPROVED' }, true, {})).rejects.toThrow(
      NotFoundError,
    );
  });
});
