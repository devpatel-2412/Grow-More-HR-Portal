import { describe, it, expect, vi } from 'vitest';
import { ProjectService } from './project.service.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeProject(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'proj-1',
    tenantId: 'tenant-1',
    name: 'Website Relaunch',
    status: 'PLANNING',
    startDate: new Date('2026-01-01'),
    endDate: null,
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdForEmployee: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    getTaskSummaries: vi.fn().mockResolvedValue(new Map()),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue(null),
  };
  return { repository, employeeRepository };
}

describe('ProjectService.getById — visibility scoping', () => {
  it('returns any tenant project when the caller has project:manage', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeProject());
    const service = new ProjectService(repository as never, employeeRepository as never);

    const result = await service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: true });

    expect(result.id).toBe('proj-1');
    expect(repository.findByIdForEmployee).not.toHaveBeenCalled();
  });

  it('scopes a non-manager to a project where they have an assigned task', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1' });
    repository.findByIdForEmployee.mockResolvedValue(makeProject());
    const service = new ProjectService(repository as never, employeeRepository as never);

    const result = await service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: false });

    expect(result.id).toBe('proj-1');
    expect(repository.findByIdForEmployee).toHaveBeenCalledWith('proj-1', 'tenant-1', 'emp-1');
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('404s a non-manager who has no task assigned in the project', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1' });
    repository.findByIdForEmployee.mockResolvedValue(null);
    const service = new ProjectService(repository as never, employeeRepository as never);

    await expect(service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: false })).rejects.toThrow(NotFoundError);
  });

  it('404s a non-manager with no employee profile at all, without querying the project', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue(null);
    const service = new ProjectService(repository as never, employeeRepository as never);

    await expect(service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: false })).rejects.toThrow(NotFoundError);
    expect(repository.findByIdForEmployee).not.toHaveBeenCalled();
  });

  it('404s when the project belongs to a different tenant, even for a manager', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeProject({ tenantId: 'other-tenant' }));
    const service = new ProjectService(repository as never, employeeRepository as never);

    await expect(service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: true })).rejects.toThrow(NotFoundError);
  });

  it('is unrestricted when no viewer is given (internal/trusted call sites, e.g. task creation)', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeProject());
    const service = new ProjectService(repository as never, employeeRepository as never);

    const result = await service.getById('tenant-1', 'proj-1');

    expect(result.id).toBe('proj-1');
    expect(employeeRepository.findByUserId).not.toHaveBeenCalled();
    expect(repository.findByIdForEmployee).not.toHaveBeenCalled();
  });
});

describe('ProjectService.list — visibility scoping', () => {
  it('lists tenant-wide with no assignedEmployeeId filter for a project:manage holder', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1' });
    repository.findMany.mockResolvedValue({ rows: [makeProject()], total: 1 });
    const service = new ProjectService(repository as never, employeeRepository as never);

    await service.list('tenant-1', { page: 1, limit: 20 } as never, { userId: 'user-1', hasProjectManage: true });

    expect(repository.findMany).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ assignedEmployeeId: undefined }),
      expect.anything(),
      0,
      20,
    );
  });

  it('scopes a non-manager to their assigned-task projects only', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-1' });
    repository.findMany.mockResolvedValue({ rows: [makeProject()], total: 1 });
    const service = new ProjectService(repository as never, employeeRepository as never);

    await service.list('tenant-1', { page: 1, limit: 20 } as never, { userId: 'user-1', hasProjectManage: false });

    expect(repository.findMany).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ assignedEmployeeId: 'emp-1' }),
      expect.anything(),
      0,
      20,
    );
  });

  it('returns an empty page without ever querying projects when a non-manager has no employee profile', async () => {
    const { repository, employeeRepository } = makeDeps();
    employeeRepository.findByUserId.mockResolvedValue(null);
    const service = new ProjectService(repository as never, employeeRepository as never);

    const result = await service.list('tenant-1', { page: 1, limit: 20 } as never, { userId: 'user-1', hasProjectManage: false });

    expect(result.rows).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('is unrestricted when no viewer is given', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findMany.mockResolvedValue({ rows: [makeProject()], total: 1 });
    const service = new ProjectService(repository as never, employeeRepository as never);

    await service.list('tenant-1', { page: 1, limit: 20 } as never);

    expect(employeeRepository.findByUserId).not.toHaveBeenCalled();
    expect(repository.findMany).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ assignedEmployeeId: undefined }),
      expect.anything(),
      0,
      20,
    );
  });
});

describe('ProjectService — progress/summary enrichment', () => {
  it('computes progress and open-task count from the real task summary', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeProject());
    repository.getTaskSummaries.mockResolvedValue(
      new Map([
        [
          'proj-1',
          { totalTasks: 4, openTasks: 1, completedTasks: 3, members: [{ id: 'emp-1', firstName: 'Ada', lastName: 'Lovelace' }], myOpenTasks: 0 },
        ],
      ]),
    );
    const service = new ProjectService(repository as never, employeeRepository as never);

    const result = await service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: true });

    expect(result.progress).toBe(75);
    expect(result.openTasksCount).toBe(1);
    expect(result.totalTasksCount).toBe(4);
    expect(result.members).toHaveLength(1);
  });

  it('reports 0% progress for a project with zero tasks, not NaN', async () => {
    const { repository, employeeRepository } = makeDeps();
    repository.findById.mockResolvedValue(makeProject());
    const service = new ProjectService(repository as never, employeeRepository as never);

    const result = await service.getById('tenant-1', 'proj-1', { userId: 'user-1', hasProjectManage: true });

    expect(result.progress).toBe(0);
    expect(Number.isNaN(result.progress)).toBe(false);
  });
});
