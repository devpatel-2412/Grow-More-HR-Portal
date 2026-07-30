import { describe, it, expect, vi } from 'vitest';
import { TaskService } from './task.service.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

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
  };
  const projectService = {
    getById: vi.fn().mockResolvedValue({ id: 'proj-1', tenantId: 'tenant-1' }),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }),
  };
  return { repository, projectService, employeeRepository };
}

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
