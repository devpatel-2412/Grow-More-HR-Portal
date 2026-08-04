import { describe, it, expect, vi } from 'vitest';
import { VendorService } from './vendor.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeVendor(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'vendor-1', tenantId: 'tenant-1', name: 'Acme Supplies', status: 'ACTIVE', ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockImplementation((data) => ({ ...makeVendor(), ...data })),
    findById: vi.fn().mockResolvedValue(makeVendor()),
    findByName: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeVendor(), id, ...data })),
    delete: vi.fn(),
    countInventoryItems: vi.fn().mockResolvedValue(0),
    findMany: vi.fn(),
  };
  return { repository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new VendorService(deps.repository as never);
}

describe('VendorService.create', () => {
  it('refuses a duplicate vendor name within the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findByName.mockResolvedValue(makeVendor());
    await expect(build(deps).create('tenant-1', { name: 'Acme Supplies' }, {})).rejects.toThrow(ConflictError);
  });
});

describe('VendorService.update', () => {
  it('404s a vendor from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeVendor({ tenantId: 'other' }));
    await expect(build(deps).update('tenant-1', 'vendor-1', { name: 'New' }, {})).rejects.toThrow(NotFoundError);
  });
});

describe('VendorService.delete', () => {
  it('refuses to delete a vendor supplying inventory items', async () => {
    const deps = makeDeps();
    deps.repository.countInventoryItems.mockResolvedValue(2);
    await expect(build(deps).delete('tenant-1', 'vendor-1', {})).rejects.toThrow(ConflictError);
    expect(deps.repository.delete).not.toHaveBeenCalled();
  });

  it('deletes a vendor with no inventory items', async () => {
    const deps = makeDeps();
    await build(deps).delete('tenant-1', 'vendor-1', {});
    expect(deps.repository.delete).toHaveBeenCalledWith('vendor-1');
  });
});
