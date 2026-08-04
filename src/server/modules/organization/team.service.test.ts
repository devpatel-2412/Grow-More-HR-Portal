import { describe, it, expect, vi } from 'vitest';
import { TeamService } from './team.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeTeam(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'team-1', tenantId: 'tenant-1', name: 'Platform', ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockImplementation((data) => ({ ...makeTeam(), ...data })),
    findById: vi.fn().mockResolvedValue(makeTeam()),
    findByName: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeTeam(), id, ...data })),
    delete: vi.fn(),
    countMembers: vi.fn().mockResolvedValue(0),
    findMany: vi.fn(),
  };
  return { repository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new TeamService(deps.repository as never);
}

describe('TeamService.create', () => {
  it('refuses a duplicate team name within the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findByName.mockResolvedValue(makeTeam());
    await expect(build(deps).create('tenant-1', { name: 'Platform' }, {})).rejects.toThrow(ConflictError);
  });

  it('connects an optional branch and lead when provided', async () => {
    const deps = makeDeps();
    await build(deps).create('tenant-1', { name: 'Platform', branchId: 'branch-1', leadId: 'emp-1' }, {});
    const [data] = deps.repository.create.mock.calls[0];
    expect(data.branch).toEqual({ connect: { id: 'branch-1' } });
    expect(data.lead).toEqual({ connect: { id: 'emp-1' } });
  });
});

describe('TeamService.update', () => {
  it('404s a team from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTeam({ tenantId: 'other' }));
    await expect(build(deps).update('tenant-1', 'team-1', { name: 'New' }, {})).rejects.toThrow(NotFoundError);
  });

  it('clears the lead when leadId is explicitly set to null', async () => {
    const deps = makeDeps();
    await build(deps).update('tenant-1', 'team-1', { leadId: null }, {});
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.lead).toEqual({ disconnect: true });
  });

  it('leaves the lead untouched when leadId is omitted', async () => {
    const deps = makeDeps();
    await build(deps).update('tenant-1', 'team-1', { description: 'updated' }, {});
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.lead).toBeUndefined();
  });
});

describe('TeamService.delete', () => {
  it('refuses to delete a team with members assigned', async () => {
    const deps = makeDeps();
    deps.repository.countMembers.mockResolvedValue(2);
    await expect(build(deps).delete('tenant-1', 'team-1', {})).rejects.toThrow(ConflictError);
    expect(deps.repository.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty team', async () => {
    const deps = makeDeps();
    await build(deps).delete('tenant-1', 'team-1', {});
    expect(deps.repository.delete).toHaveBeenCalledWith('team-1');
  });
});
