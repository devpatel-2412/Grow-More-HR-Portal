import { describe, it, expect, vi } from 'vitest';
import { AssetService } from './asset.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeAsset(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'asset-1', tenantId: 'tenant-1', status: 'AVAILABLE', employeeId: null, ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(makeAsset()),
    findBySerial: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeAsset(), id, ...data })),
    findMany: vi.fn(),
  };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    findByUserId: vi.fn(),
  };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new AssetService(deps.repository as never, deps.employeeRepository as never);
}

describe('AssetService.create', () => {
  it('refuses a duplicate serial number within the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findBySerial.mockResolvedValue(makeAsset());
    await expect(
      build(deps).create('tenant-1', { name: 'Laptop', serialNumber: 'SN-1', type: 'LAPTOP' }, {}),
    ).rejects.toThrow(ConflictError);
  });
});

describe('AssetService.assign', () => {
  it('refuses to assign an asset that is not available', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeAsset({ status: 'ASSIGNED' }));
    await expect(build(deps).assign('tenant-1', 'asset-1', 'emp-1', {})).rejects.toThrow(ConflictError);
  });

  it('refuses to assign an asset under repair', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeAsset({ status: 'UNDER_REPAIR' }));
    await expect(build(deps).assign('tenant-1', 'asset-1', 'emp-1', {})).rejects.toThrow(ConflictError);
  });

  it('404s an employee from another tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'emp-1', tenantId: 'other' });
    await expect(build(deps).assign('tenant-1', 'asset-1', 'emp-1', {})).rejects.toThrow(NotFoundError);
  });

  it('assigns an available asset and stamps the assignment time', async () => {
    const deps = makeDeps();
    await build(deps).assign('tenant-1', 'asset-1', 'emp-1', {});
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.status).toBe('ASSIGNED');
    expect(data.assignedAt).toBeInstanceOf(Date);
  });
});

describe('AssetService.unassign', () => {
  it('refuses to unassign an asset that is not currently assigned', async () => {
    const deps = makeDeps();
    await expect(build(deps).unassign('tenant-1', 'asset-1', {})).rejects.toThrow(ConflictError);
  });

  it('frees an assigned asset back to available', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeAsset({ status: 'ASSIGNED', employeeId: 'emp-1' }));
    await build(deps).unassign('tenant-1', 'asset-1', {});
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.status).toBe('AVAILABLE');
    expect(data.assignedAt).toBeNull();
  });
});

describe('AssetService.changeStatus', () => {
  it('treats RETIRED as terminal', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeAsset({ status: 'RETIRED' }));
    await expect(build(deps).changeStatus('tenant-1', 'asset-1', 'AVAILABLE', {})).rejects.toThrow(ConflictError);
  });

  it('clears the assignment when moving an assigned asset into repair', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeAsset({ status: 'ASSIGNED', employeeId: 'emp-1' }));

    await build(deps).changeStatus('tenant-1', 'asset-1', 'UNDER_REPAIR', {});

    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.status).toBe('UNDER_REPAIR');
    expect(data.employee).toEqual({ disconnect: true });
    expect(data.assignedAt).toBeNull();
  });

  it('rejects a no-op transition to the same status', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeAsset({ status: 'AVAILABLE' }));
    await expect(build(deps).changeStatus('tenant-1', 'asset-1', 'AVAILABLE', {})).rejects.toThrow(ConflictError);
  });
});
