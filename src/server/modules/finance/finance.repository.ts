import { prisma } from '../../db/prisma.js';
import type { Prisma, FinanceType, FinanceStatus } from '@prisma/client';

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export class FinanceRepository {
  findById(id: string) {
    return prisma.financeDocument.findUnique({ where: { id } });
  }

  findWithDetail(id: string) {
    return prisma.financeDocument.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } },
    });
  }

  /** The highest existing sequence number for this document type this tenant has issued, regardless of year. */
  async nextSequence(tenantId: string, type: FinanceType): Promise<number> {
    const count = await prisma.financeDocument.count({ where: { tenantId, type } });
    return count + 1;
  }

  createWithLineItems(
    data: Omit<Prisma.FinanceDocumentCreateInput, 'lineItems' | 'subtotal' | 'totalAmount'>,
    lineItems: LineItemInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxRate = (data as { taxRate?: number }).taxRate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const document = await tx.financeDocument.create({
        data: {
          ...data,
          subtotal,
          taxAmount,
          totalAmount,
          lineItems: {
            create: lineItems.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              sortOrder: index,
            })),
          },
        },
      });
      return document;
    });
  }

  /** Replacing line items recomputes the document's totals in the same transaction so they never drift apart. */
  replaceLineItemsAndRecalculate(id: string, lineItems: LineItemInput[], taxRate: number) {
    return prisma.$transaction(async (tx) => {
      await tx.financeLineItem.deleteMany({ where: { financeDocumentId: id } });

      const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      return tx.financeDocument.update({
        where: { id },
        data: {
          subtotal,
          taxAmount,
          totalAmount,
          taxRate,
          lineItems: {
            create: lineItems.map((item, index) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              sortOrder: index,
            })),
          },
        },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  update(id: string, data: Prisma.FinanceDocumentUpdateInput) {
    return prisma.financeDocument.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.financeDocument.delete({ where: { id } });
  }

  /**
   * Recording a payment and rolling it into the document's status must be atomic — a payment
   * written without updating amountPaid/status would make the ledger and the document disagree.
   */
  recordPaymentAndRollUp(
    documentId: string,
    payment: Omit<Prisma.FinancePaymentCreateInput, 'financeDocument'>,
    newAmountPaid: number,
    newStatus: FinanceStatus,
  ) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.financePayment.create({
        data: { ...payment, financeDocument: { connect: { id: documentId } } },
      });
      const document = await tx.financeDocument.update({
        where: { id: documentId },
        data: { amountPaid: newAmountPaid, status: newStatus },
      });
      return { payment: created, document };
    });
  }

  async findMany(
    tenantId: string,
    filter: { type?: FinanceType; status?: FinanceStatus; clientPortalId?: string; projectId?: string },
    skip: number,
    take: number,
  ) {
    const where: Prisma.FinanceDocumentWhereInput = {
      tenantId,
      type: filter.type,
      status: filter.status,
      clientPortalId: filter.clientPortalId,
      projectId: filter.projectId,
    };
    const [rows, total] = await Promise.all([
      prisma.financeDocument.findMany({ where, orderBy: { issueDate: 'desc' }, skip, take }),
      prisma.financeDocument.count({ where }),
    ]);
    return { rows, total };
  }

  /** Aggregate totals per type/status for the finance dashboard. */
  async summarise(tenantId: string) {
    const grouped = await prisma.financeDocument.groupBy({
      by: ['type', 'status'],
      where: { tenantId },
      _sum: { totalAmount: true, amountPaid: true },
      _count: true,
    });
    return grouped.map((row) => ({
      type: row.type,
      status: row.status,
      count: row._count,
      totalAmount: row._sum.totalAmount ?? 0,
      amountPaid: row._sum.amountPaid ?? 0,
    }));
  }
}
