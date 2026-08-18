import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from './notification.service.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

const { emailSend } = vi.hoisted(() => ({ emailSend: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../shared/email/email.service.js', () => ({ emailService: { send: emailSend } }));

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
  const userRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'user-1', email: 'worker@acme.com' }),
  };
  return { repository, userRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new NotificationService(deps.repository as never, deps.userRepository as never);
}

beforeEach(() => {
  emailSend.mockClear();
});

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

  it('also emails the target user using the same title/body', async () => {
    const deps = makeDeps();
    await build(deps).notify({ tenantId: 'tenant-1', userId: 'user-1', type: 'LEAVE_APPROVED', title: 'Leave approved', body: 'Enjoy your time off.' });
    expect(emailSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'worker@acme.com', subject: 'Leave approved', template: 'notification_leave_approved', tenantId: 'tenant-1' }),
    );
  });

  it('skips the email (but still creates the in-app notification) when the user cannot be found', async () => {
    const deps = makeDeps();
    deps.userRepository.findById.mockResolvedValue(null);
    await build(deps).notify({ tenantId: 'tenant-1', userId: 'ghost', type: 'GENERIC', title: 'Hi', body: 'Body' });
    expect(deps.repository.create).toHaveBeenCalledOnce();
    expect(emailSend).not.toHaveBeenCalled();
  });

  it('still creates the in-app notification even if sending the email throws', async () => {
    const deps = makeDeps();
    emailSend.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      build(deps).notify({ tenantId: 'tenant-1', userId: 'user-1', type: 'GENERIC', title: 'Hi', body: 'Body' }),
    ).resolves.toBeUndefined();
    expect(deps.repository.create).toHaveBeenCalledOnce();
  });

  it('creates the in-app notification but skips the email entirely when skipEmail is set', async () => {
    const deps = makeDeps();
    await build(deps).notify({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'TASK_DUE_SOON',
      title: 'Task due soon',
      body: 'Body',
      skipEmail: true,
    });
    expect(deps.repository.create).toHaveBeenCalledOnce();
    expect(emailSend).not.toHaveBeenCalled();
  });

  it('does not leak skipEmail/emailOverride into the notification row written to the database', async () => {
    const deps = makeDeps();
    await build(deps).notify({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'TASK_OVERDUE',
      title: 'Overdue',
      body: 'Body',
      emailOverride: { subject: 'Custom subject', html: '<p>x</p>', text: 'x' },
    });
    const createArg = deps.repository.create.mock.calls[0][0];
    expect(createArg).not.toHaveProperty('skipEmail');
    expect(createArg).not.toHaveProperty('emailOverride');
  });

  it('sends the richer emailOverride template instead of the generic wrapper when supplied', async () => {
    const deps = makeDeps();
    await build(deps).notify({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'TASK_ASSIGNED',
      title: 'New task assigned to you',
      body: 'Design homepage',
      emailOverride: { subject: 'Custom subject', html: '<p>custom html</p>', text: 'custom text' },
    });
    expect(emailSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Custom subject', html: '<p>custom html</p>', text: 'custom text' }),
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
