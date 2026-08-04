import { InventoryItemRepository } from './inventory.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryItemsQuerySchema,
  stockInSchema,
  stockOutSchema,
  adjustStockSchema,
} from './inventory.validators.js';

const ITEM_SORTABLE_FIELDS = ['name', 'sku', 'quantityOnHand', 'category', 'createdAt'] as const;

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class InventoryService {
  constructor(
    private readonly repository: InventoryItemRepository = new InventoryItemRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  /** `RequestMeta.actorUserId` is a User id; the ledger's `performedBy` points at an EmployeeProfile — an actor with no profile (e.g. an admin account) simply leaves it unset. */
  private async resolvePerformedById(actorUserId: string | undefined) {
    if (!actorUserId) return undefined;
    const employee = await this.employeeRepository.findByUserId(actorUserId);
    return employee?.id;
  }

  async create(tenantId: string, input: z.infer<typeof createInventoryItemSchema>, meta: RequestMeta) {
    const existing = await this.repository.findBySku(tenantId, input.sku);
    if (existing) throw new ConflictError('An item with this SKU already exists');

    const item = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      name: input.name,
      sku: input.sku,
      category: input.category,
      unit: input.unit,
      reorderLevel: input.reorderLevel,
      unitCost: input.unitCost,
      vendor: input.vendorId ? { connect: { id: input.vendorId } } : undefined,
    });
    await this.audit(tenantId, meta, 'INVENTORY_ITEM_CREATED', item.id);

    if (input.openingQuantity > 0) {
      const { item: updated } = await this.repository.recordTransaction(tenantId, item.id, input.openingQuantity, {
        type: 'IN',
        quantity: input.openingQuantity,
        reference: 'Opening stock',
        performedById: await this.resolvePerformedById(meta.actorUserId),
      });
      await this.audit(tenantId, meta, 'INVENTORY_STOCK_IN', item.id);
      return updated;
    }

    return item;
  }

  async requireItem(tenantId: string, id: string) {
    const item = await this.repository.findById(id);
    if (!item || item.tenantId !== tenantId) throw new NotFoundError('Inventory item not found');
    return item;
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateInventoryItemSchema>, meta: RequestMeta) {
    await this.requireItem(tenantId, id);
    const { vendorId, ...rest } = input;
    const updated = await this.repository.update(id, {
      ...rest,
      vendor: vendorId === undefined ? undefined : vendorId === null ? { disconnect: true } : { connect: { id: vendorId } },
    });
    await this.audit(tenantId, meta, 'INVENTORY_ITEM_UPDATED', id);
    return updated;
  }

  /** Deleting would erase the transaction ledger's parent — refuse once any stock movement has happened. */
  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireItem(tenantId, id);
    const txCount = await this.repository.countTransactions(id);
    if (txCount > 0) throw new ConflictError('Cannot delete an item that has stock movement history');

    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'INVENTORY_ITEM_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listInventoryItemsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, ITEM_SORTABLE_FIELDS, { field: 'name', direction: 'asc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { category: query.category, vendorId: query.vendorId, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async stockIn(tenantId: string, id: string, input: z.infer<typeof stockInSchema>, meta: RequestMeta) {
    await this.requireItem(tenantId, id);
    const { item } = await this.repository.recordTransaction(tenantId, id, input.quantity, {
      type: 'IN',
      quantity: input.quantity,
      reference: input.reference,
      vendorId: input.vendorId,
      performedById: await this.resolvePerformedById(meta.actorUserId),
    });
    await this.audit(tenantId, meta, 'INVENTORY_STOCK_IN', id);
    return item;
  }

  async stockOut(tenantId: string, id: string, input: z.infer<typeof stockOutSchema>, meta: RequestMeta) {
    const current = await this.requireItem(tenantId, id);
    if (input.quantity > current.quantityOnHand) {
      throw new ConflictError(`Only ${current.quantityOnHand} ${current.unit} on hand — cannot remove ${input.quantity}`);
    }

    const { item } = await this.repository.recordTransaction(tenantId, id, -input.quantity, {
      type: 'OUT',
      quantity: input.quantity,
      reference: input.reference,
      performedById: await this.resolvePerformedById(meta.actorUserId),
    });
    await this.audit(tenantId, meta, 'INVENTORY_STOCK_OUT', id);
    return item;
  }

  /** A signed correction — `quantity` is the delta applied directly, unlike stockIn/stockOut which always take a positive magnitude. */
  async adjustStock(tenantId: string, id: string, input: z.infer<typeof adjustStockSchema>, meta: RequestMeta) {
    const current = await this.requireItem(tenantId, id);
    if (current.quantityOnHand + input.quantity < 0) {
      throw new ConflictError(`Adjustment would take stock below zero (currently ${current.quantityOnHand})`);
    }

    const { item } = await this.repository.recordTransaction(tenantId, id, input.quantity, {
      type: 'ADJUSTMENT',
      quantity: input.quantity,
      reference: input.reference,
      performedById: await this.resolvePerformedById(meta.actorUserId),
    });
    await this.audit(tenantId, meta, 'INVENTORY_STOCK_ADJUSTED', id);
    return item;
  }

  async listTransactions(tenantId: string, id: string) {
    await this.requireItem(tenantId, id);
    return this.repository.findTransactionsByItem(id);
  }

  private audit(
    tenantId: string,
    meta: RequestMeta,
    action: Parameters<typeof auditLogService.record>[0]['action'],
    targetId: string,
  ) {
    return auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action,
      targetType: 'InventoryItem',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const inventoryService = new InventoryService();
