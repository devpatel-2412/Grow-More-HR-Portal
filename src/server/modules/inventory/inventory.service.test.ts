import { describe, it, expect, vi } from 'vitest';
import { InventoryService } from './inventory.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'item-1', tenantId: 'tenant-1', name: 'A4 Paper', sku: 'SKU-1', unit: 'box', quantityOnHand: 10, ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockImplementation((data) => ({ ...makeItem(), ...data })),
    findById: vi.fn().mockResolvedValue(makeItem()),
    findBySku: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeItem(), id, ...data })),
    delete: vi.fn(),
    countTransactions: vi.fn().mockResolvedValue(0),
    findMany: vi.fn(),
    recordTransaction: vi.fn().mockImplementation((_tenantId, itemId, delta) => ({
      item: { ...makeItem(), id: itemId, quantityOnHand: 10 + delta },
      transaction: { id: 'tx-1' },
    })),
    findTransactionsByItem: vi.fn(),
  };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-actor' }),
  };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new InventoryService(deps.repository as never, deps.employeeRepository as never);
}

describe('InventoryService.create', () => {
  it('refuses a duplicate SKU within the tenant', async () => {
    const deps = makeDeps();
    deps.repository.findBySku.mockResolvedValue(makeItem());
    await expect(
      build(deps).create('tenant-1', { name: 'A4 Paper', sku: 'SKU-1', unit: 'box', reorderLevel: 0, unitCost: 0, openingQuantity: 0 }, {}),
    ).rejects.toThrow(ConflictError);
  });

  it('records an opening-stock transaction when openingQuantity is positive', async () => {
    const deps = makeDeps();
    const item = await build(deps).create(
      'tenant-1',
      { name: 'A4 Paper', sku: 'SKU-1', unit: 'box', reorderLevel: 0, unitCost: 0, openingQuantity: 25 },
      {},
    );
    expect(deps.repository.recordTransaction).toHaveBeenCalledWith(
      'tenant-1',
      expect.any(String),
      25,
      expect.objectContaining({ type: 'IN', quantity: 25, reference: 'Opening stock' }),
    );
    expect(item.quantityOnHand).toBe(35);
  });

  it('skips the opening transaction when openingQuantity is zero', async () => {
    const deps = makeDeps();
    await build(deps).create(
      'tenant-1',
      { name: 'A4 Paper', sku: 'SKU-1', unit: 'box', reorderLevel: 0, unitCost: 0, openingQuantity: 0 },
      {},
    );
    expect(deps.repository.recordTransaction).not.toHaveBeenCalled();
  });
});

describe('InventoryService.delete', () => {
  it('404s an item from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ tenantId: 'other' }));
    await expect(build(deps).delete('tenant-1', 'item-1', {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to delete an item with transaction history', async () => {
    const deps = makeDeps();
    deps.repository.countTransactions.mockResolvedValue(3);
    await expect(build(deps).delete('tenant-1', 'item-1', {})).rejects.toThrow(ConflictError);
  });

  it('deletes an item with no transaction history', async () => {
    const deps = makeDeps();
    await build(deps).delete('tenant-1', 'item-1', {});
    expect(deps.repository.delete).toHaveBeenCalledWith('item-1');
  });
});

describe('InventoryService.stockOut', () => {
  it('refuses to remove more than is on hand', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ quantityOnHand: 5 }));
    await expect(build(deps).stockOut('tenant-1', 'item-1', { quantity: 10 }, {})).rejects.toThrow(ConflictError);
  });

  it('removes stock within the available quantity', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ quantityOnHand: 10 }));
    await build(deps).stockOut('tenant-1', 'item-1', { quantity: 4 }, {});
    expect(deps.repository.recordTransaction).toHaveBeenCalledWith(
      'tenant-1',
      'item-1',
      -4,
      expect.objectContaining({ type: 'OUT', quantity: 4 }),
    );
  });
});

describe('InventoryService.adjustStock', () => {
  it('refuses a negative adjustment that would take stock below zero', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ quantityOnHand: 3 }));
    await expect(build(deps).adjustStock('tenant-1', 'item-1', { quantity: -5 }, {})).rejects.toThrow(ConflictError);
  });

  it('allows a positive correction', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeItem({ quantityOnHand: 3 }));
    await build(deps).adjustStock('tenant-1', 'item-1', { quantity: 2 }, {});
    expect(deps.repository.recordTransaction).toHaveBeenCalledWith(
      'tenant-1',
      'item-1',
      2,
      expect.objectContaining({ type: 'ADJUSTMENT', quantity: 2 }),
    );
  });
});
