import { describe, it, expect, vi } from 'vitest';
import { NotificationService } from './notification.service.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

function makeNotification(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'notif-1', tenantId: 'tenant-1', userId: 'user-1', type: 'GENERIC', title: 'Hi', body: 'Body', readAt: null, ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeNotification()),
    findMany: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    unreadCount: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(makeNotification()),
    markRead: vi.fn().mockResolvedValue(makeNotification({ readAt: new Date() })),
    markAllRead: vi.fn().mockResolvedValue({ count: 0 }),
  };
  return { repository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new NotificationService(deps.repository as never);
}

describe('NotificationService.notify', () => {
  it('swallows a repository failure instead of throwing — notifying must never break the caller', async () => {
    const deps = makeDeps();
    deps.repository.create.mockRejectedValue(new Error('db down'));
    const service = build(deps);

    await expect(
      service.notify({ tenantId: 'tenant-1', userId: 'user-1', type: 'GENERIC', title: 'Hi', body: 'Body' }),
    ).resolves.toBeUndefined();
  });

  it('creates the notification on success', async () => {
    const deps = makeDeps();
    await build(deps).notify({ tenantId: 'tenant-1', userId: 'user-1', type: 'TASK_ASSIGNED', title: 'Hi', body: 'Body' });
    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1', type: 'TASK_ASSIGNED' }),
    );
  });
});

describe('NotificationService.markRead', () => {
  it('404s a notification that does not exist', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(null);
    await expect(build(deps).markRead('user-1', 'notif-1')).rejects.toThrow(NotFoundError);
  });

  it("refuses to mark another user's notification as read", async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeNotification({ userId: 'someone-else' }));
    await expect(build(deps).markRead('user-1', 'notif-1')).rejects.toThrow(ForbiddenError);
    expect(deps.repository.markRead).not.toHaveBeenCalled();
  });

  it('marks the caller\'s own notification as read', async () => {
    const deps = makeDeps();
    await build(deps).markRead('user-1', 'notif-1');
    expect(deps.repository.markRead).toHaveBeenCalledWith('notif-1');
  });
});

describe('NotificationService.list / unreadCount / markAllRead', () => {
  it('paginates the caller\'s own notifications', async () => {
    const deps = makeDeps();
    deps.repository.findMany.mockResolvedValue({ rows: [makeNotification()], total: 1 });
    const result = await build(deps).list('user-1', 1, 20, false);
    expect(deps.repository.findMany).toHaveBeenCalledWith('user-1', { unreadOnly: false }, 0, 20);
    expect(result.rows).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('reports the unread count', async () => {
    const deps = makeDeps();
    deps.repository.unreadCount.mockResolvedValue(3);
    await expect(build(deps).unreadCount('user-1')).resolves.toBe(3);
  });

  it('marks everything read for the caller', async () => {
    const deps = makeDeps();
    await build(deps).markAllRead('user-1');
    expect(deps.repository.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
