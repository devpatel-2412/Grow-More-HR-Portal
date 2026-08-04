import { describe, it, expect, vi } from 'vitest';
import { BranchService } from './branch.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeBranch(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'branch-1', tenantId: 'tenant-1', name: 'HQ', code: 'HQ', ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockImplementation((data) => ({ ...makeBranch(), ...data })),
    findById: vi.fn().mockResolvedValue(makeBranch()),
    findByCode: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeBranch(), id, ...data })),
    delete: vi.fn(),
    countEmployees: vi.fn().mockResolvedValue(0),
    countTeams: vi.fn().mockResolvedValue(0),
    findMany: vi.fn(),
  };
  return { repository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new BranchService(deps.repository as never);
}

describe('BranchService.create', () => {
  it('refuses a duplicate branch code within the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findByCode.mockResolvedValue(makeBranch());
    await expect(build(deps).create('tenant-1', { name: 'HQ', code: 'HQ' }, {})).rejects.toThrow(ConflictError);
  });

  it('creates a branch scoped to the tenant', async () => {
    const deps = makeDeps();
    const branch = await build(deps).create('tenant-1', { name: 'HQ', code: 'HQ' }, {});
    expect(branch.code).toBe('HQ');
  });
});

describe('BranchService.update', () => {
  it('404s a branch from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeBranch({ tenantId: 'other' }));
    await expect(build(deps).update('tenant-1', 'branch-1', { name: 'New' }, {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to rename onto a code already used by another branch', async () => {
    const deps = makeDeps();
    deps.repository.findByCode.mockResolvedValue(makeBranch({ id: 'branch-2' }));
    await expect(build(deps).update('tenant-1', 'branch-1', { code: 'HQ' }, {})).rejects.toThrow(ConflictError);
  });

  it('allows updating a branch to keep its own existing code', async () => {
    const deps = makeDeps();
    deps.repository.findByCode.mockResolvedValue(makeBranch({ id: 'branch-1' }));
    await expect(build(deps).update('tenant-1', 'branch-1', { code: 'HQ' }, {})).resolves.toBeTruthy();
  });
});

describe('BranchService.delete', () => {
  it('refuses to delete a branch with employees assigned', async () => {
    const deps = makeDeps();
    deps.repository.countEmployees.mockResolvedValue(3);
    await expect(build(deps).delete('tenant-1', 'branch-1', {})).rejects.toThrow(ConflictError);
    expect(deps.repository.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a branch with teams assigned', async () => {
    const deps = makeDeps();
    deps.repository.countTeams.mockResolvedValue(1);
    await expect(build(deps).delete('tenant-1', 'branch-1', {})).rejects.toThrow(ConflictError);
  });

  it('deletes an empty branch', async () => {
    const deps = makeDeps();
    await build(deps).delete('tenant-1', 'branch-1', {});
    expect(deps.repository.delete).toHaveBeenCalledWith('branch-1');
  });
});
