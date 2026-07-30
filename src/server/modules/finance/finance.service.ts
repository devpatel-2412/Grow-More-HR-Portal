import { FinanceRepository } from './finance.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { FinanceStatus, FinanceType } from '@prisma/client';
import type { z } from 'zod';
import type {
  createFinanceDocumentSchema,
  updateFinanceDocumentSchema,
  recordPaymentSchema,
  listFinanceDocumentsQuerySchema,
} from './finance.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const TYPE_PREFIX: Record<FinanceType, string> = {
  QUOTATION: 'QUO',
  INVOICE: 'INV',
  EXPENSE: 'EXP',
  BILL: 'BILL',
};

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatDocumentNumber(type: FinanceType, year: number, sequence: number): string {
  return `${TYPE_PREFIX[type]}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** DRAFT → SENT → PAID, with VOID reachable from DRAFT/SENT only. PAID and VOID are terminal. */
const ALLOWED_TRANSITIONS: Record<FinanceStatus, FinanceStatus[]> = {
  DRAFT: ['SENT', 'VOID'],
  SENT: ['PAID', 'OVERDUE', 'VOID'],
  OVERDUE: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
};

export class FinanceService {
  constructor(private readonly repository: FinanceRepository = new FinanceRepository()) {}

  async createDocument(
    tenantId: string,
    createdByEmployeeId: string | undefined,
    input: z.infer<typeof createFinanceDocumentSchema>,
    meta: RequestMeta,
  ) {
    const sequence = await this.repository.nextSequence(tenantId, input.type);
    const number = formatDocumentNumber(input.type, input.issueDate.getUTCFullYear(), sequence);

    const { lineItems, clientPortalId, projectId, ...rest } = input;
    const document = await this.repository.createWithLineItems(
      {
        tenant: { connect: { id: tenantId } },
        number,
        status: 'DRAFT',
        ...rest,
        clientPortal: clientPortalId ? { connect: { id: clientPortalId } } : undefined,
        project: projectId ? { connect: { id: projectId } } : undefined,
        createdBy: createdByEmployeeId ? { connect: { id: createdByEmployeeId } } : undefined,
      },
      lineItems,
    );

    await this.audit(tenantId, meta, 'FINANCE_DOC_CREATED', document.id);
    return document;
  }

  async requireDocument(tenantId: string, id: string) {
    const document = await this.repository.findById(id);
    if (!document || document.tenantId !== tenantId) throw new NotFoundError('Finance document not found');
    return document;
  }

  async getDocument(tenantId: string, id: string) {
    await this.requireDocument(tenantId, id);
    return this.repository.findWithDetail(id);
  }

  async updateDocument(tenantId: string, id: string, input: z.infer<typeof updateFinanceDocumentSchema>, meta: RequestMeta) {
    await this.requireDocument(tenantId, id);
    const detail = await this.repository.findWithDetail(id);
    if (!detail) throw new NotFoundError('Finance document not found');
    if (detail.status !== 'DRAFT') throw new ConflictError('Only a draft document can be edited');

    const { lineItems, taxRate, issueDate, dueDate, notes } = input;
    let updated: unknown = detail;

    // A tax-rate change always needs the totals recalculated, whether or not the line items
    // themselves changed — reusing the same recompute path keeps subtotal/tax/total in lockstep.
    if (lineItems || taxRate !== undefined) {
      updated = await this.repository.replaceLineItemsAndRecalculate(
        id,
        lineItems ?? detail.lineItems.map((item) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice })),
        taxRate ?? detail.taxRate,
      );
    }

    if (issueDate !== undefined || dueDate !== undefined || notes !== undefined) {
      updated = await this.repository.update(id, { issueDate, dueDate, notes });
    }

    await this.audit(tenantId, meta, 'FINANCE_DOC_UPDATED', id);
    return updated;
  }

  private async transition(tenantId: string, id: string, target: FinanceStatus) {
    const document = await this.requireDocument(tenantId, id);
    if (!ALLOWED_TRANSITIONS[document.status].includes(target)) {
      throw new ConflictError(`A ${document.status.toLowerCase()} document cannot move to ${target.toLowerCase()}`);
    }
    return document;
  }

  async sendDocument(tenantId: string, id: string, meta: RequestMeta) {
    await this.transition(tenantId, id, 'SENT');
    const updated = await this.repository.update(id, { status: 'SENT' });
    await this.audit(tenantId, meta, 'FINANCE_DOC_SENT', id);
    return updated;
  }

  async voidDocument(tenantId: string, id: string, meta: RequestMeta) {
    await this.transition(tenantId, id, 'VOID');
    const updated = await this.repository.update(id, { status: 'VOID' });
    await this.audit(tenantId, meta, 'FINANCE_DOC_VOIDED', id);
    return updated;
  }

  async deleteDocument(tenantId: string, id: string) {
    const document = await this.requireDocument(tenantId, id);
    if (document.status !== 'DRAFT') throw new ConflictError('Only a draft document can be deleted');
    await this.repository.delete(id);
  }

  /**
   * A payment can only be recorded against a document that has actually been issued (SENT or
   * OVERDUE) — a DRAFT has no obligation attached to it yet, and a VOID/PAID one is closed.
   * Overpayment is rejected rather than silently accepted so the ledger never shows more paid
   * than owed.
   */
  async recordPayment(tenantId: string, id: string, input: z.infer<typeof recordPaymentSchema>, meta: RequestMeta) {
    const document = await this.requireDocument(tenantId, id);
    if (document.status !== 'SENT' && document.status !== 'OVERDUE') {
      throw new ConflictError('Payments can only be recorded against a sent or overdue document');
    }

    const remaining = round2(document.totalAmount - document.amountPaid);
    if (input.amount > remaining + 0.01) {
      throw new ValidationError(`Payment of ${input.amount} exceeds the remaining balance of ${remaining}`);
    }

    const newAmountPaid = round2(document.amountPaid + input.amount);
    const newStatus: FinanceStatus = newAmountPaid >= document.totalAmount - 0.01 ? 'PAID' : document.status;

    const { document: updated } = await this.repository.recordPaymentAndRollUp(
      id,
      { amount: input.amount, paidAt: input.paidAt, method: input.method, reference: input.reference },
      newAmountPaid,
      newStatus,
    );

    await this.audit(tenantId, meta, 'FINANCE_PAYMENT_RECORDED', id);
    return updated;
  }

  async listDocuments(tenantId: string, query: z.infer<typeof listFinanceDocumentsQuerySchema>) {
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { type: query.type, status: query.status, clientPortalId: query.clientPortalId, projectId: query.projectId },
      (query.page - 1) * query.limit,
      query.limit,
    );

    // OVERDUE is a read-time projection over SENT documents past their due date, not a status
    // anyone sets by hand — this way a document that was SENT yesterday and is now late shows up
    // correctly without a background job flipping stored state.
    const now = new Date();
    const withOverdue = rows.map((row) =>
      row.status === 'SENT' && row.dueDate && row.dueDate < now ? { ...row, status: 'OVERDUE' as const } : row,
    );

    return { rows: withOverdue, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  summary(tenantId: string) {
    return this.repository.summarise(tenantId);
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
      targetType: 'FinanceDocument',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const financeService = new FinanceService();
