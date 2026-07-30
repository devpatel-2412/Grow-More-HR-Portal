import { describe, it, expect, vi } from 'vitest';
import { TimeLogService, minutesBetween } from './timelog.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeLog(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tl-1',
    tenantId: 'tenant-1',
    employeeId: 'emp-1',
    taskId: 'task-1',
    startedAt: new Date('2026-07-29T09:00:00.000Z'),
    endedAt: null,
    durationMinutes: 0,
    source: 'TIMER',
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeLog()),
    findById: vi.fn(),
    findRunning: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
    sumMinutes: vi.fn(),
    closeAndRollUp: vi.fn().mockResolvedValue(makeLog({ endedAt: new Date(), durationMinutes: 90 })),
    createAndRollUp: vi.fn().mockResolvedValue(makeLog({ source: 'MANUAL', durationMinutes: 45 })),
    deleteAndRollBack: vi.fn(),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1', managerId: 'mgr-1' }),
    findById: vi.fn(),
  };
  const taskRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'task-1', tenantId: 'tenant-1' }),
  };
  return { repository, employeeRepository, taskRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new TimeLogService(deps.repository as never, deps.employeeRepository as never, deps.taskRepository as never);
}

describe('minutesBetween', () => {
  it('rounds to whole minutes', () => {
    expect(minutesBetween(new Date('2026-07-29T09:00:00Z'), new Date('2026-07-29T10:30:00Z'))).toBe(90);
  });

  it('never returns a negative duration', () => {
    expect(minutesBetween(new Date('2026-07-29T10:00:00Z'), new Date('2026-07-29T09:00:00Z'))).toBe(0);
  });
});

describe('TimeLogService.startTimer', () => {
  it('refuses a second concurrent timer', async () => {
    const deps = makeDeps();
    deps.repository.findRunning.mockResolvedValue(makeLog());

    await expect(build(deps).startTimer('user-1', 'tenant-1', {}, {})).rejects.toThrow(ConflictError);
  });

  it('404s when the task belongs to another tenant', async () => {
    const deps = makeDeps();
    deps.taskRepository.findById.mockResolvedValue({ id: 'task-1', tenantId: 'tenant-other' });

    await expect(build(deps).startTimer('user-1', 'tenant-1', { taskId: 'task-1' }, {})).rejects.toThrow(NotFoundError);
  });

  it('starts a timer with no end time', async () => {
    const deps = makeDeps();

    await build(deps).startTimer('user-1', 'tenant-1', { taskId: 'task-1' }, {});

    const created = deps.repository.create.mock.calls[0][0];
    expect(created.source).toBe('TIMER');
    expect(created.endedAt).toBeUndefined();
  });
});

describe('TimeLogService.stopTimer', () => {
  it('404s when nothing is running', async () => {
    const deps = makeDeps();

    await expect(build(deps).stopTimer('user-1', 'tenant-1', undefined, {})).rejects.toThrow(NotFoundError);
  });

  it('closes the running log and rolls the minutes into its task', async () => {
    const deps = makeDeps();
    const startedAt = new Date(Date.now() - 90 * 60000);
    deps.repository.findRunning.mockResolvedValue(makeLog({ startedAt, taskId: 'task-1' }));

    await build(deps).stopTimer('user-1', 'tenant-1', 'wrapped up', {});

    const [id, , durationMinutes, taskId] = deps.repository.closeAndRollUp.mock.calls[0];
    expect(id).toBe('tl-1');
    expect(durationMinutes).toBe(90);
    expect(taskId).toBe('task-1');
  });
});

describe('TimeLogService.logManual', () => {
  it('derives endedAt from the duration and rolls up to the task', async () => {
    const deps = makeDeps();

    await build(deps).logManual(
      'user-1',
      'tenant-1',
      { taskId: 'task-1', startedAt: new Date('2026-07-29T09:00:00.000Z'), durationMinutes: 45 },
      {},
    );

    const [data, taskId, minutes] = deps.repository.createAndRollUp.mock.calls[0];
    expect(data.endedAt.toISOString()).toBe('2026-07-29T09:45:00.000Z');
    expect(data.source).toBe('MANUAL');
    expect(taskId).toBe('task-1');
    expect(minutes).toBe(45);
  });
});

describe('TimeLogService.delete', () => {
  it("blocks deleting another employee's log without tenant permission", async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeLog({ employeeId: 'emp-other' }));

    await expect(build(deps).delete('user-1', 'tenant-1', 'tl-1', false, {})).rejects.toThrow(ForbiddenError);
  });

  it('rolls the minutes back off the task when deleted', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeLog({ durationMinutes: 60, endedAt: new Date() }));

    await build(deps).delete('user-1', 'tenant-1', 'tl-1', false, {});

    expect(deps.repository.deleteAndRollBack).toHaveBeenCalledWith('tl-1', 'task-1', 60);
  });
});

describe('TimeLogService.list scoping', () => {
  it('silently narrows an unprivileged caller to their own logs', async () => {
    const deps = makeDeps();
    deps.repository.findMany.mockResolvedValue({ rows: [], total: 0 });

    await build(deps).list('tenant-1', { userId: 'user-1', canReadTenant: false }, { page: 1, limit: 20 } as never);

    expect(deps.repository.findMany.mock.calls[0][1].employeeId).toBe('emp-1');
  });

  it("blocks an unprivileged caller from reading a non-report's logs", async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'emp-9', managerId: 'someone-else' });

    await expect(
      build(deps).list('tenant-1', { userId: 'user-1', canReadTenant: false }, { page: 1, limit: 20, employeeId: 'emp-9' } as never),
    ).rejects.toThrow(ForbiddenError);
  });
});
