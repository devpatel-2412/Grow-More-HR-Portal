import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTaskDueCheck } from './task-due.job.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { prisma } from '../db/prisma.js';

vi.mock('../db/prisma.js', () => ({
  prisma: { task: { findMany: vi.fn() }, employeeProfile: { findUnique: vi.fn() } },
}));
vi.mock('../modules/notifications/notification.service.js', () => ({ notificationService: { notify: vi.fn().mockResolvedValue(undefined) } }));

const findMany = vi.mocked(prisma.task.findMany);
const findManager = vi.mocked(prisma.employeeProfile.findUnique);
const notify = vi.mocked(notificationService.notify);

function makeTaskRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    tenantId: 'tenant-1',
    title: 'Ship it',
    dueDate: new Date(2026, 0, 2),
    projectId: 'proj-1',
    project: { name: 'Website Relaunch' },
    assignedTo: { userId: 'user-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runTaskDueCheck — due soon', () => {
  it('sends an in-app-only (no email) TASK_DUE_SOON notification to the assignee', async () => {
    const now = new Date(2026, 0, 1);
    findMany.mockResolvedValueOnce([makeTaskRow()]).mockResolvedValueOnce([]);

    const result = await runTaskDueCheck(now);

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1', type: 'TASK_DUE_SOON', skipEmail: true }),
    );
    expect(result.dueSoonNotified).toBe(1);
  });

  it('only queries non-done tasks due within the reminder window', async () => {
    findMany.mockResolvedValue([]);
    const now = new Date(2026, 0, 1);

    await runTaskDueCheck(now);

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: 'DONE' },
          dueDate: { gte: now, lte: new Date(now.getTime() + 2 * 86_400_000) },
          assignedToId: { not: null },
        }),
      }),
    );
  });

  it('skips a due-soon task with no assignee — there is no one to notify', async () => {
    findMany.mockResolvedValueOnce([makeTaskRow({ assignedTo: null })]).mockResolvedValueOnce([]);

    const result = await runTaskDueCheck(new Date(2026, 0, 1));

    expect(notify).not.toHaveBeenCalled();
    expect(result.dueSoonNotified).toBe(0);
  });
});

describe('runTaskDueCheck — overdue', () => {
  it('emails the assignee a TASK_OVERDUE notification', async () => {
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([makeTaskRow({ dueDate: new Date(2025, 11, 20) })]);

    const result = await runTaskDueCheck(new Date(2026, 0, 1));

    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', type: 'TASK_OVERDUE' }));
    const call = notify.mock.calls.find((c) => (c[0] as { userId: string }).userId === 'user-1');
    expect(call?.[0]).not.toHaveProperty('skipEmail', true);
    expect(result.overdueNotified).toBe(1);
  });

  it('also notifies the assignee\'s manager, when one is configured', async () => {
    findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeTaskRow({ dueDate: new Date(2025, 11, 20), assignedTo: { userId: 'user-1', firstName: 'Ada', lastName: 'Lovelace', managerId: 'emp-mgr' } }),
      ]);
    findManager.mockResolvedValue({ userId: 'user-mgr', firstName: 'Grace' } as never);

    await runTaskDueCheck(new Date(2026, 0, 1));

    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', type: 'TASK_OVERDUE' }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-mgr', type: 'TASK_OVERDUE' }));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('does not look up a manager when the assignee has none configured', async () => {
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([makeTaskRow({ dueDate: new Date(2025, 11, 20) })]);

    await runTaskDueCheck(new Date(2026, 0, 1));

    expect(findManager).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('only queries non-done tasks past their due date', async () => {
    findMany.mockResolvedValue([]);
    const now = new Date(2026, 0, 1);

    await runTaskDueCheck(now);

    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: 'DONE' }, dueDate: { lt: now }, assignedToId: { not: null } }),
      }),
    );
  });
});
