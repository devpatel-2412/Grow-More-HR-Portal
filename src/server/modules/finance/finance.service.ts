import { FinanceRepository } from './finance.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const FINANCE_SORTABLE_FIELDS = ['number', 'issueDate', 'dueDate', 'totalAmount', 'amountPaid', 'status'] as const;
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
  constructor(
    private readonly repository: FinanceRepository = new FinanceRepository(),
    private readonly tenantRepository: TenantRepository = new TenantRepository(),
  ) {}

  /** `undefined` means "don't split" (GST not configured for this tenant or this document) — the caller keeps a single flat taxAmount. */
  private async resolveInterState(tenantId: string, placeOfSupplyStateCode: string | null | undefined): Promise<boolean | undefined> {
    if (!placeOfSupplyStateCode) return undefined;
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant?.gstStateCode) return undefined;
    return tenant.gstStateCode !== placeOfSupplyStateCode;
  }

  async createDocument(
    tenantId: string,
    createdByEmployeeId: string | undefined,
    input: z.infer<typeof createFinanceDocumentSchema>,
    meta: RequestMeta,
  ) {
    const sequence = await this.repository.nextSequence(tenantId, input.type);
    const number = formatDocumentNumber(input.type, input.issueDate.getUTCFullYear(), sequence);
    const isInterState = await this.resolveInterState(tenantId, input.placeOfSupplyStateCode);

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
      isInterState,
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

    const { lineItems, taxRate, placeOfSupplyStateCode, issueDate, dueDate, notes } = input;
    let updated: unknown = detail;

    // A tax-rate or place-of-supply change always needs the totals recalculated, whether or not
    // the line items themselves changed — reusing the same recompute path keeps subtotal/tax/total
    // and the CGST/SGST/IGST split in lockstep.
    if (lineItems || taxRate !== undefined || placeOfSupplyStateCode !== undefined) {
      const effectivePlaceOfSupply = placeOfSupplyStateCode === undefined ? detail.placeOfSupplyStateCode : placeOfSupplyStateCode;
      const isInterState = await this.resolveInterState(tenantId, effectivePlaceOfSupply);
      updated = await this.repository.replaceLineItemsAndRecalculate(
        id,
        lineItems ?? detail.lineItems.map((item) => ({ description: item.description, hsnCode: item.hsnCode ?? undefined, quantity: item.quantity, unitPrice: item.unitPrice })),
        taxRate ?? detail.taxRate,
        isInterState,
      );
      if (placeOfSupplyStateCode !== undefined) {
        updated = await this.repository.update(id, { placeOfSupplyStateCode });
      }
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
    const orderBy = toPrismaOrderBy(query.sort, FINANCE_SORTABLE_FIELDS, { field: 'issueDate', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { type: query.type, status: query.status, clientPortalId: query.clientPortalId, projectId: query.projectId },
      orderBy,
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

  /**
   * Accrual-basis P&L: revenue recognized when an INVOICE is issued (not when paid), expenses
   * recognized when an EXPENSE/BILL is issued. QUOTATION is a proposal, not a transaction, so it
   * never counts. DRAFT/VOID documents are excluded at the repository level.
   */
  async profitAndLoss(tenantId: string, from: Date, to: Date) {
    const rows = await this.repository.findForProfitAndLoss(tenantId, from, to);

    const byMonth = new Map<string, { revenue: number; expenses: number }>();
    let revenue = 0;
    let expenses = 0;

    for (const row of rows) {
      const isRevenue = row.type === 'INVOICE';
      const isExpense = row.type === 'EXPENSE' || row.type === 'BILL';
      if (!isRevenue && !isExpense) continue;

      const monthKey = row.issueDate.toISOString().slice(0, 7);
      const bucket = byMonth.get(monthKey) ?? { revenue: 0, expenses: 0 };
      if (isRevenue) {
        revenue += row.totalAmount;
        bucket.revenue += row.totalAmount;
      } else {
        expenses += row.totalAmount;
        bucket.expenses += row.totalAmount;
      }
      byMonth.set(monthKey, bucket);
    }

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      revenue: round2(revenue),
      expenses: round2(expenses),
      netProfit: round2(revenue - expenses),
      byMonth: [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, totals]) => ({
          month,
          revenue: round2(totals.revenue),
          expenses: round2(totals.expenses),
          netProfit: round2(totals.revenue - totals.expenses),
        })),
    };
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
