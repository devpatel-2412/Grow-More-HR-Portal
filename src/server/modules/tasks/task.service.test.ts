import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from './task.service.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { notificationService } from '../notifications/notification.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../notifications/notification.service.js', () => ({ notificationService: { notify: vi.fn().mockResolvedValue(undefined) } }));

// notificationService is a module-scoped mock shared across every test in this file — clear its
// call history between tests so an earlier test's notify() call can't leak into a later
// "was not called" assertion.
beforeEach(() => {
  vi.clearAllMocks();
});

function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    tenantId: 'tenant-1',
    projectId: 'proj-1',
    title: 'Ship it',
    status: 'TODO',
    priority: 'MEDIUM',
    assignedToId: 'emp-1',
    subtasks: [],
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    // Defaults to "already on the project" so PROJECT_ASSIGNED doesn't unexpectedly fire in tests
    // that aren't specifically about it — override per-test to exercise that path.
    existsForEmployeeInProject: vi.fn().mockResolvedValue(true),
  };
  const projectService = {
    getById: vi.fn().mockResolvedValue({ id: 'proj-1', tenantId: 'tenant-1', name: 'Website Relaunch' }),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null }),
    findById: vi.fn().mockResolvedValue({ id: 'emp-2', userId: 'user-emp-2', firstName: 'Bob', lastName: 'Builder', managerId: null }),
  };
  return { repository, projectService, employeeRepository };
}

describe('TaskService — assignment notifications', () => {
  it('notifies the assignee when a task is created already assigned', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.create.mockResolvedValue(makeTask({ assignedToId: 'emp-2', title: 'Ship it' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.create('tenant-1', { projectId: 'proj-1', title: 'Ship it', assignedToId: 'emp-2' } as never);

    expect(employeeRepository.findById).toHaveBeenCalledWith('emp-2');
    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-emp-2', type: 'TASK_ASSIGNED', body: 'Ship it' }),
    );
  });

  it('does not notify when a task is created with no assignee', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.create.mockResolvedValue(makeTask({ assignedToId: null }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.create('tenant-1', { projectId: 'proj-1', title: 'Ship it' } as never);

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('notifies the new assignee on reassignment but not when other fields change without a reassignment', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ priority: 'HIGH' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'admin-user', true, 'task-1', { priority: 'HIGH' });
    expect(notificationService.notify).not.toHaveBeenCalled();

    repository.update.mockResolvedValue(makeTask({ assignedToId: 'emp-2' }));
    await service.update('tenant-1', 'admin-user', true, 'task-1', { assignedToId: 'emp-2' });
    expect(notificationService.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-emp-2', type: 'TASK_ASSIGNED' }));
  });
});

describe('TaskService — project assignment notifications', () => {
  it('also sends PROJECT_ASSIGNED the first time this employee has any task on the project', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.existsForEmployeeInProject.mockResolvedValue(false); // no other task on this project yet
    repository.create.mockResolvedValue(makeTask({ id: 'task-1', assignedToId: 'emp-2', title: 'Ship it' }));
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-mgr', firstName: 'Grace', lastName: 'Manager', managerId: null });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.create(
      'tenant-1',
      { projectId: 'proj-1', title: 'Ship it', assignedToId: 'emp-2' } as never,
      { actorUserId: 'user-mgr' },
    );

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROJECT_ASSIGNED',
        userId: 'user-emp-2',
        body: expect.stringContaining('Grace Manager'),
      }),
    );
  });

  it('does not send a duplicate PROJECT_ASSIGNED when the employee already has another task on the project', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.existsForEmployeeInProject.mockResolvedValue(true);
    repository.create.mockResolvedValue(makeTask({ assignedToId: 'emp-2' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.create('tenant-1', { projectId: 'proj-1', title: 'Ship it', assignedToId: 'emp-2' } as never);

    const calledTypes = notificationService.notify.mock.calls.map((call) => (call[0] as { type: string }).type);
    expect(calledTypes).toEqual(['TASK_ASSIGNED']);
  });

  it('excludes the task itself from the "already on project" check on reassignment', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ id: 'task-1', assignedToId: 'emp-2' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'admin-user', true, 'task-1', { assignedToId: 'emp-2' });

    expect(repository.existsForEmployeeInProject).toHaveBeenCalledWith('proj-1', 'emp-2', 'task-1');
  });
});

describe('TaskService — status change notifications', () => {
  function makeEmployeeLookup(entries: Record<string, { id: string; userId: string; firstName: string; lastName: string; managerId: string | null }>) {
    return (id: string) => Promise.resolve(entries[id] ?? null);
  }

  it('notifies the responsible manager when the assignee moves a task to REVIEW', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'IN_PROGRESS', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'REVIEW' }));
    employeeRepository.findById.mockImplementation(
      makeEmployeeLookup({
        'emp-1': { id: 'emp-1', userId: 'user-emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: 'emp-mgr' },
        'emp-mgr': { id: 'emp-mgr', userId: 'user-mgr', firstName: 'Grace', lastName: 'Manager', managerId: null },
      }),
    );
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { status: 'REVIEW' });

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TASK_READY_FOR_REVIEW', userId: 'user-mgr' }),
    );
  });

  it('does not notify on REVIEW when the assignee has no manager configured', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'IN_PROGRESS', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'REVIEW' }));
    employeeRepository.findById.mockResolvedValue({ id: 'emp-1', userId: 'user-emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { status: 'REVIEW' });

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('notifies the assignee when someone else marks their task DONE', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'REVIEW', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'DONE' }));
    employeeRepository.findById.mockResolvedValue({ id: 'emp-1', userId: 'user-emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null });
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-mgr', firstName: 'Grace', lastName: 'Manager', managerId: null });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'manager-user', true, 'task-1', { status: 'DONE' });

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TASK_COMPLETED', userId: 'user-emp-1' }),
    );
  });

  it('does not notify the assignee when they close their own task themselves', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'REVIEW', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'DONE' }));
    employeeRepository.findById.mockResolvedValue({ id: 'emp-1', userId: 'user-emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null });
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { status: 'DONE' });

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('notifies both the assignee and their manager when a DONE task is reopened', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'DONE', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'TODO' }));
    employeeRepository.findById.mockImplementation(
      makeEmployeeLookup({
        'emp-1': { id: 'emp-1', userId: 'user-emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: 'emp-mgr' },
        'emp-mgr': { id: 'emp-mgr', userId: 'user-mgr', firstName: 'Grace', lastName: 'Manager', managerId: null },
      }),
    );
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'manager-user', true, 'task-1', { status: 'TODO' });

    const notifiedUserIds = notificationService.notify.mock.calls.map((call) => (call[0] as { userId: string }).userId);
    expect(notifiedUserIds.sort()).toEqual(['user-emp-1', 'user-mgr']);
    expect(notificationService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'TASK_REOPENED', userId: 'user-emp-1' }));
    expect(notificationService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'TASK_REOPENED', userId: 'user-mgr' }));
  });

  it('reopening without a configured manager still notifies the assignee alone', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'DONE', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'TODO' }));
    employeeRepository.findById.mockResolvedValue({ id: 'emp-1', userId: 'user-emp-1', firstName: 'Ada', lastName: 'Lovelace', managerId: null });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'manager-user', true, 'task-1', { status: 'TODO' });

    expect(notificationService.notify).toHaveBeenCalledOnce();
    expect(notificationService.notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'TASK_REOPENED', userId: 'user-emp-1' }));
  });

  it('does not notify for a non-actionable transition like TODO -> IN_PROGRESS', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'TODO', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'IN_PROGRESS' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { status: 'IN_PROGRESS' });

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('does not notify when status is present in the payload but unchanged from the current value', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'TODO', assignedToId: 'emp-1' }));
    repository.update.mockResolvedValue(makeTask({ status: 'TODO', loggedHours: 1 }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { status: 'TODO', loggedHours: 1 });

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('does not notify for a status change on an unassigned task', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ status: 'IN_PROGRESS', assignedToId: null }));
    repository.update.mockResolvedValue(makeTask({ status: 'REVIEW', assignedToId: null }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'admin-user', true, 'task-1', { status: 'REVIEW' });

    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});

describe('TaskService.update — ownership vs. TASK_MANAGE permission', () => {
  it('lets a TASK_MANAGE holder change any field, including reassignment', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask());
    repository.update.mockResolvedValue(makeTask({ assignedToId: 'emp-2' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'admin-user', true, 'task-1', { assignedToId: 'emp-2', priority: 'HIGH' });

    expect(repository.update).toHaveBeenCalledWith('task-1', { assignedToId: 'emp-2', priority: 'HIGH' });
  });

  it('lets the assignee change only status without TASK_MANAGE', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask());
    repository.update.mockResolvedValue(makeTask({ status: 'IN_PROGRESS' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { status: 'IN_PROGRESS' });

    expect(repository.update).toHaveBeenCalledWith('task-1', { status: 'IN_PROGRESS' });
  });

  it('lets the assignee log hours without TASK_MANAGE', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask());
    repository.update.mockResolvedValue(makeTask({ loggedHours: 2 }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.update('tenant-1', 'assignee-user', false, 'task-1', { loggedHours: 2 });

    expect(repository.update).toHaveBeenCalledOnce();
  });

  it('blocks a non-manager from reassigning a task even if they are the current assignee', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask());
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await expect(service.update('tenant-1', 'assignee-user', false, 'task-1', { assignedToId: 'emp-2' })).rejects.toThrow(
      ForbiddenError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('blocks a non-manager, non-assignee from changing status on someone else\'s task', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ assignedToId: 'someone-else' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await expect(service.update('tenant-1', 'bystander-user', false, 'task-1', { status: 'DONE' })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('404s for a task in a different tenant', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeTask({ tenantId: 'other-tenant' }));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await expect(service.update('tenant-1', 'user-1', true, 'task-1', { status: 'DONE' })).rejects.toThrow(NotFoundError);
  });
});

describe('TaskService.list — project-scoped visibility', () => {
  it('reuses ProjectService.getById to authorize a projectId-filtered listing, propagating its rejection', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    projectService.getById.mockRejectedValue(new NotFoundError('Project not found'));
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await expect(
      service.list('tenant-1', { page: 1, limit: 20, projectId: 'proj-1' } as never, { userId: 'user-1', hasProjectManage: false }),
    ).rejects.toThrow(NotFoundError);
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('lists tasks once the caller is confirmed to have access to the project', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findMany.mockResolvedValue({ rows: [], total: 0 });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.list('tenant-1', { page: 1, limit: 20, projectId: 'proj-1' } as never, { userId: 'user-1', hasProjectManage: false });

    expect(projectService.getById).toHaveBeenCalledWith('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: false });
    expect(repository.findMany).toHaveBeenCalledOnce();
  });

  it('skips the project authorization check entirely when no projectId filter is given', async () => {
    const { repository, projectService, employeeRepository } = makeDeps();
    repository.findMany.mockResolvedValue({ rows: [], total: 0 });
    const service = new TaskService(repository as never, projectService as never, employeeRepository as never);

    await service.list('tenant-1', { page: 1, limit: 20 } as never);

    expect(projectService.getById).not.toHaveBeenCalled();
    expect(repository.findMany).toHaveBeenCalledOnce();
  });
});
