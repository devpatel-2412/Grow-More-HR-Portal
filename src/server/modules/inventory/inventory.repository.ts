import { prisma } from '../../db/prisma.js';
import type { Prisma, InventoryTransactionType } from '@prisma/client';

export class InventoryItemRepository {
  create(data: Prisma.InventoryItemCreateInput) {
    return prisma.inventoryItem.create({ data });
  }

  findById(id: string) {
    return prisma.inventoryItem.findUnique({ where: { id } });
  }

  findBySku(tenantId: string, sku: string) {
    return prisma.inventoryItem.findUnique({ where: { tenantId_sku: { tenantId, sku } } });
  }

  update(id: string, data: Prisma.InventoryItemUpdateInput) {
    return prisma.inventoryItem.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.inventoryItem.delete({ where: { id } });
  }

  countTransactions(itemId: string) {
    return prisma.inventoryTransaction.count({ where: { itemId } });
  }

  async findMany(
    tenantId: string,
    filter: { category?: string; vendorId?: string; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      category: filter.category,
      vendorId: filter.vendorId,
      OR: filter.search
        ? [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { sku: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, orderBy, skip, take }),
      prisma.inventoryItem.count({ where }),
    ]);
    return { rows, total };
  }

  /** Applies the delta to the item and appends the ledger row in one transaction — quantityOnHand is always a derived cache, never edited directly. */
  recordTransaction(
    tenantId: string,
    itemId: string,
    delta: number,
    entry: { type: InventoryTransactionType; quantity: number; reference?: string; vendorId?: string; performedById?: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantityOnHand: { increment: delta } },
      });
      const transaction = await tx.inventoryTransaction.create({
        data: {
          tenant: { connect: { id: tenantId } },
          item: { connect: { id: itemId } },
          type: entry.type,
          quantity: entry.quantity,
          reference: entry.reference,
          vendor: entry.vendorId ? { connect: { id: entry.vendorId } } : undefined,
          performedBy: entry.performedById ? { connect: { id: entry.performedById } } : undefined,
        },
      });
      return { item, transaction };
    });
  }

  findTransactionsByItem(itemId: string) {
    return prisma.inventoryTransaction.findMany({ where: { itemId }, orderBy: { createdAt: 'desc' } });
  }
}
