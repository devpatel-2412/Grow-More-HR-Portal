import { describe, it, expect, vi } from 'vitest';
import { ChecklistService } from './checklist.service.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'item-1', tenantId: 'tenant-1', employeeId: 'emp-1', label: 'Collect ID', isCompleted: false, ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockImplementation((data) => ({ ...makeItem(), ...data })),
    findById: vi.fn().mockResolvedValue(makeItem()),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeItem(), id, ...data })),
    delete: vi.fn(),
    findByEmployee: vi.fn().mockResolvedValue([]),
  };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }),
  };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new ChecklistService(deps.repository as never, deps.employeeRepository as never);
}

describe('ChecklistService.list', () => {
  it('lets an employee view their own checklist without EMPLOYEE_UPDATE', async () => {
    const deps = makeDeps();
    await expect(build(deps).list('tenant-1', 'emp-1', { userId: 'user-1', canManage: false })).resolves.toEqual([]);
  });

  it("blocks an employee from viewing someone else's checklist", async () => {
    const deps = makeDeps();
    deps.employeeRepository.findByUserId.mockResolvedValue({ id: 'other-emp' });
    await expect(build(deps).list('tenant-1', 'emp-1', { userId: 'user-1', canManage: false })).rejects.toThrow(ForbiddenError);
  });

  it('lets an EMPLOYEE_UPDATE holder view any checklist', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findByUserId.mockResolvedValue(null);
    await expect(build(deps).list('tenant-1', 'emp-1', { userId: 'user-1', canManage: true })).resolves.toEqual([]);
  });
});

describe('ChecklistService.update', () => {
  it('404s an item from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ tenantId: 'other' }));
    await expect(build(deps).update('tenant-1', 'item-1', { isCompleted: true }, {})).rejects.toThrow(NotFoundError);
  });

  it('stamps completedAt when marking complete, and clears it when reopened', async () => {
    const deps = makeDeps();
    const completed = await build(deps).update('tenant-1', 'item-1', { isCompleted: true }, {});
    expect(completed.completedAt).toBeInstanceOf(Date);

    const reopened = await build(deps).update('tenant-1', 'item-1', { isCompleted: false }, {});
    expect(reopened.completedAt).toBeNull();
  });
});

describe('ChecklistService.delete', () => {
  it('404s an item from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ tenantId: 'other' }));
    await expect(build(deps).delete('tenant-1', 'item-1', {})).rejects.toThrow(NotFoundError);
  });

  it('deletes an item in the caller tenant', async () => {
    const deps = makeDeps();
    await build(deps).delete('tenant-1', 'item-1', {});
    expect(deps.repository.delete).toHaveBeenCalledWith('item-1');
  });
});
