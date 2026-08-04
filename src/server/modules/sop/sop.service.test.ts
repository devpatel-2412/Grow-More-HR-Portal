import { describe, it, expect, vi } from 'vitest';
import { SopService } from './sop.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeSop(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'sop-1', tenantId: 'tenant-1', title: 'Onboarding', status: 'DRAFT', version: 1, body: 'Step 1', ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockImplementation((data) => ({ ...makeSop(), ...data })),
    findById: vi.fn().mockResolvedValue(makeSop()),
    findByTitle: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeSop(), id, ...data })),
    delete: vi.fn(),
    findMany: vi.fn(),
    reviseAndUpdate: vi.fn().mockImplementation((sopId, _tenantId, currentVersion, _currentBody, newBody) => ({
      ...makeSop(),
      id: sopId,
      body: newBody,
      version: currentVersion + 1,
    })),
    findRevisions: vi.fn(),
  };
  const employeeRepository = { findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }) };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new SopService(deps.repository as never, deps.employeeRepository as never);
}

describe('SopService.create', () => {
  it('refuses a duplicate title within the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findByTitle.mockResolvedValue(makeSop());
    await expect(build(deps).create('tenant-1', { title: 'Onboarding', body: 'x' }, {})).rejects.toThrow(ConflictError);
  });
});

describe('SopService.update', () => {
  it('404s an SOP from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ tenantId: 'other' }));
    await expect(build(deps).update('tenant-1', 'sop-1', { title: 'New' }, {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to edit an archived SOP', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'ARCHIVED' }));
    await expect(build(deps).update('tenant-1', 'sop-1', { title: 'New' }, {})).rejects.toThrow(ConflictError);
  });

  it('overwrites the body in place for a draft, without creating a revision', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'DRAFT', body: 'old' }));
    await build(deps).update('tenant-1', 'sop-1', { body: 'new' }, {});
    expect(deps.repository.reviseAndUpdate).not.toHaveBeenCalled();
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.body).toBe('new');
  });

  it('snapshots a revision and bumps the version when editing a published SOP', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'PUBLISHED', body: 'old', version: 2 }));
    await build(deps).update('tenant-1', 'sop-1', { body: 'new' }, { actorUserId: 'user-1' });
    expect(deps.repository.reviseAndUpdate).toHaveBeenCalledWith('sop-1', 'tenant-1', 2, 'old', 'new', 'emp-1');
  });

  it('does not revise when only non-body fields change', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'PUBLISHED', body: 'old' }));
    await build(deps).update('tenant-1', 'sop-1', { category: 'HR' }, {});
    expect(deps.repository.reviseAndUpdate).not.toHaveBeenCalled();
  });
});

describe('SopService.publish', () => {
  it('refuses to publish a non-draft SOP', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'PUBLISHED' }));
    await expect(build(deps).publish('tenant-1', 'sop-1', {})).rejects.toThrow(ConflictError);
  });

  it('publishes a draft SOP', async () => {
    const deps = makeDeps();
    const updated = await build(deps).publish('tenant-1', 'sop-1', {});
    expect(updated.status).toBe('PUBLISHED');
  });
});

describe('SopService.archive', () => {
  it('refuses to archive a non-published SOP', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'DRAFT' }));
    await expect(build(deps).archive('tenant-1', 'sop-1', {})).rejects.toThrow(ConflictError);
  });

  it('archives a published SOP', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'PUBLISHED' }));
    const updated = await build(deps).archive('tenant-1', 'sop-1', {});
    expect(updated.status).toBe('ARCHIVED');
  });
});

describe('SopService.delete', () => {
  it('refuses to delete a non-draft SOP', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeSop({ status: 'PUBLISHED' }));
    await expect(build(deps).delete('tenant-1', 'sop-1', {})).rejects.toThrow(ConflictError);
  });

  it('deletes a draft SOP', async () => {
    const deps = makeDeps();
    await build(deps).delete('tenant-1', 'sop-1', {});
    expect(deps.repository.delete).toHaveBeenCalledWith('sop-1');
  });
});
