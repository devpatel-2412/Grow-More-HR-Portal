import { describe, it, expect, vi } from 'vitest';
import { FinanceService, formatDocumentNumber, round2 } from './finance.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeDocument(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'doc-1',
    tenantId: 'tenant-1',
    type: 'INVOICE',
    status: 'DRAFT',
    subtotal: 1000,
    taxRate: 10,
    taxAmount: 100,
    totalAmount: 1100,
    amountPaid: 0,
    dueDate: null,
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    findById: vi.fn().mockResolvedValue(makeDocument()),
    findWithDetail: vi.fn().mockResolvedValue({ ...makeDocument(), lineItems: [{ description: 'Work', quantity: 1, unitPrice: 1000 }] }),
    nextSequence: vi.fn().mockResolvedValue(1),
    createWithLineItems: vi.fn().mockResolvedValue(makeDocument()),
    replaceLineItemsAndRecalculate: vi.fn().mockResolvedValue(makeDocument()),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeDocument(), id, ...data })),
    delete: vi.fn(),
    recordPaymentAndRollUp: vi.fn(),
    findMany: vi.fn(),
    summarise: vi.fn(),
    findForProfitAndLoss: vi.fn().mockResolvedValue([]),
  };
  const tenantRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'tenant-1', gstStateCode: null }),
  };
  return { repository, tenantRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new FinanceService(deps.repository as never, deps.tenantRepository as never);
}

describe('formatDocumentNumber', () => {
  it('pads the sequence and prefixes by type', () => {
    expect(formatDocumentNumber('INVOICE', 2026, 1)).toBe('INV-2026-0001');
    expect(formatDocumentNumber('QUOTATION', 2026, 42)).toBe('QUO-2026-0042');
    expect(formatDocumentNumber('EXPENSE', 2026, 123)).toBe('EXP-2026-0123');
    expect(formatDocumentNumber('BILL', 2026, 9999)).toBe('BILL-2026-9999');
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(10.005)).toBeCloseTo(10.01, 2);
    expect(round2(10.001)).toBe(10);
  });
});

describe('FinanceService.createDocument', () => {
  it('assigns a sequential, type-prefixed document number', async () => {
    const deps = makeDeps();
    deps.repository.nextSequence.mockResolvedValue(7);

    await build(deps).createDocument(
      'tenant-1',
      'emp-1',
      {
        type: 'INVOICE',
        issueDate: new Date('2026-07-29T00:00:00.000Z'),
        currency: 'USD',
        taxRate: 0,
        lineItems: [{ description: 'Work', quantity: 1, unitPrice: 100 }],
      },
      {},
    );

    const created = deps.repository.createWithLineItems.mock.calls[0][0];
    expect(created.number).toBe('INV-2026-0007');
    expect(created.status).toBe('DRAFT');
  });
});

describe('FinanceService — status transitions', () => {
  it('allows DRAFT to move to SENT', async () => {
    const deps = makeDeps();
    await build(deps).sendDocument('tenant-1', 'doc-1', {});
    expect(deps.repository.update).toHaveBeenCalledWith('doc-1', { status: 'SENT' });
  });

  it('refuses to send an already-sent document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'SENT' }));
    await expect(build(deps).sendDocument('tenant-1', 'doc-1', {})).rejects.toThrow(ConflictError);
  });

  it('refuses to void a paid document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'PAID' }));
    await expect(build(deps).voidDocument('tenant-1', 'doc-1', {})).rejects.toThrow(ConflictError);
  });

  it('allows voiding a sent document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'SENT' }));
    await build(deps).voidDocument('tenant-1', 'doc-1', {});
    expect(deps.repository.update).toHaveBeenCalledWith('doc-1', { status: 'VOID' });
  });

  it('404s a document from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ tenantId: 'other' }));
    await expect(build(deps).sendDocument('tenant-1', 'doc-1', {})).rejects.toThrow(NotFoundError);
  });
});

describe('FinanceService.updateDocument', () => {
  it('refuses to edit a document once it has been sent', async () => {
    const deps = makeDeps();
    deps.repository.findWithDetail.mockResolvedValue({ ...makeDocument({ status: 'SENT' }), lineItems: [] });
    await expect(build(deps).updateDocument('tenant-1', 'doc-1', { notes: 'x' }, {})).rejects.toThrow(ConflictError);
  });

  it('recalculates totals when the tax rate changes without new line items', async () => {
    const deps = makeDeps();
    await build(deps).updateDocument('tenant-1', 'doc-1', { taxRate: 20 }, {});

    const [id, lineItems, taxRate] = deps.repository.replaceLineItemsAndRecalculate.mock.calls[0];
    expect(id).toBe('doc-1');
    expect(lineItems).toEqual([{ description: 'Work', quantity: 1, unitPrice: 1000 }]);
    expect(taxRate).toBe(20);
  });
});

describe('FinanceService.recordPayment', () => {
  it('refuses a payment against a draft document', async () => {
    const deps = makeDeps();
    await expect(
      build(deps).recordPayment('tenant-1', 'doc-1', { amount: 100, paidAt: new Date(), method: 'bank' }, {}),
    ).rejects.toThrow(ConflictError);
  });

  it('refuses to overpay beyond the remaining balance', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'SENT', totalAmount: 1100, amountPaid: 0 }));
    await expect(
      build(deps).recordPayment('tenant-1', 'doc-1', { amount: 5000, paidAt: new Date(), method: 'bank' }, {}),
    ).rejects.toThrow(ValidationError);
  });

  it('flips the document to PAID once the full amount is recorded', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'SENT', totalAmount: 1100, amountPaid: 0 }));
    deps.repository.recordPaymentAndRollUp.mockResolvedValue({ document: makeDocument({ status: 'PAID', amountPaid: 1100 }) });

    await build(deps).recordPayment('tenant-1', 'doc-1', { amount: 1100, paidAt: new Date(), method: 'bank' }, {});

    const [, , newAmountPaid, newStatus] = deps.repository.recordPaymentAndRollUp.mock.calls[0];
    expect(newAmountPaid).toBe(1100);
    expect(newStatus).toBe('PAID');
  });

  it('keeps the document SENT after a partial payment', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'SENT', totalAmount: 1100, amountPaid: 0 }));
    deps.repository.recordPaymentAndRollUp.mockResolvedValue({ document: makeDocument({ status: 'SENT', amountPaid: 500 }) });

    await build(deps).recordPayment('tenant-1', 'doc-1', { amount: 500, paidAt: new Date(), method: 'bank' }, {});

    const [, , newAmountPaid, newStatus] = deps.repository.recordPaymentAndRollUp.mock.calls[0];
    expect(newAmountPaid).toBe(500);
    expect(newStatus).toBe('SENT');
  });

  it('accepts a payment against an overdue document', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'OVERDUE', totalAmount: 1100, amountPaid: 0 }));
    deps.repository.recordPaymentAndRollUp.mockResolvedValue({ document: makeDocument({ status: 'PAID' }) });

    await expect(
      build(deps).recordPayment('tenant-1', 'doc-1', { amount: 1100, paidAt: new Date(), method: 'bank' }, {}),
    ).resolves.toBeTruthy();
  });
});

describe('FinanceService.listDocuments — overdue projection', () => {
  it('projects a past-due SENT document as OVERDUE without mutating storage', async () => {
    const deps = makeDeps();
    const pastDue = makeDocument({ status: 'SENT', dueDate: new Date('2000-01-01') });
    deps.repository.findMany.mockResolvedValue({ rows: [pastDue], total: 1 });

    const { rows } = await build(deps).listDocuments('tenant-1', { page: 1, limit: 20 } as never);

    expect(rows[0].status).toBe('OVERDUE');
    expect(deps.repository.update).not.toHaveBeenCalled();
  });

  it('leaves a SENT document with no due date alone', async () => {
    const deps = makeDeps();
    const noDueDate = makeDocument({ status: 'SENT', dueDate: null });
    deps.repository.findMany.mockResolvedValue({ rows: [noDueDate], total: 1 });

    const { rows } = await build(deps).listDocuments('tenant-1', { page: 1, limit: 20 } as never);

    expect(rows[0].status).toBe('SENT');
  });
});

describe('FinanceService.deleteDocument', () => {
  it('refuses to delete a document once it is no longer a draft', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeDocument({ status: 'SENT' }));
    await expect(build(deps).deleteDocument('tenant-1', 'doc-1')).rejects.toThrow(ConflictError);
  });
});

describe('FinanceService.createDocument — GST split', () => {
  const baseInput = {
    type: 'INVOICE' as const,
    issueDate: new Date('2026-07-29T00:00:00.000Z'),
    currency: 'USD',
    taxRate: 18,
    lineItems: [{ description: 'Work', quantity: 1, unitPrice: 100 }],
  };

  it('does not split tax when the tenant has no gstStateCode configured', async () => {
    const deps = makeDeps();
    deps.tenantRepository.findById.mockResolvedValue({ id: 'tenant-1', gstStateCode: null });
    await build(deps).createDocument('tenant-1', 'emp-1', { ...baseInput, placeOfSupplyStateCode: '27' }, {});
    const isInterState = deps.repository.createWithLineItems.mock.calls[0][2];
    expect(isInterState).toBeUndefined();
  });

  it('does not split tax when the document has no placeOfSupplyStateCode', async () => {
    const deps = makeDeps();
    deps.tenantRepository.findById.mockResolvedValue({ id: 'tenant-1', gstStateCode: '27' });
    await build(deps).createDocument('tenant-1', 'emp-1', baseInput, {});
    const isInterState = deps.repository.createWithLineItems.mock.calls[0][2];
    expect(isInterState).toBeUndefined();
  });

  it('splits as CGST/SGST (same state) when place of supply matches the tenant', async () => {
    const deps = makeDeps();
    deps.tenantRepository.findById.mockResolvedValue({ id: 'tenant-1', gstStateCode: '27' });
    await build(deps).createDocument('tenant-1', 'emp-1', { ...baseInput, placeOfSupplyStateCode: '27' }, {});
    const isInterState = deps.repository.createWithLineItems.mock.calls[0][2];
    expect(isInterState).toBe(false);
  });

  it('splits as IGST (cross-state) when place of supply differs from the tenant', async () => {
    const deps = makeDeps();
    deps.tenantRepository.findById.mockResolvedValue({ id: 'tenant-1', gstStateCode: '27' });
    await build(deps).createDocument('tenant-1', 'emp-1', { ...baseInput, placeOfSupplyStateCode: '09' }, {});
    const isInterState = deps.repository.createWithLineItems.mock.calls[0][2];
    expect(isInterState).toBe(true);
  });
});

describe('FinanceService.profitAndLoss', () => {
  it('recognizes INVOICE as revenue and EXPENSE/BILL as expenses, ignoring QUOTATION', async () => {
    const deps = makeDeps();
    deps.repository.findForProfitAndLoss.mockResolvedValue([
      { type: 'INVOICE', totalAmount: 1000, issueDate: new Date('2026-01-15') },
      { type: 'EXPENSE', totalAmount: 200, issueDate: new Date('2026-01-20') },
      { type: 'BILL', totalAmount: 100, issueDate: new Date('2026-02-05') },
      { type: 'QUOTATION', totalAmount: 5000, issueDate: new Date('2026-01-10') },
    ]);

    const report = await build(deps).profitAndLoss('tenant-1', new Date('2026-01-01'), new Date('2026-02-28'));

    expect(report.revenue).toBe(1000);
    expect(report.expenses).toBe(300);
    expect(report.netProfit).toBe(700);
  });

  it('buckets totals by month, sorted chronologically', async () => {
    const deps = makeDeps();
    deps.repository.findForProfitAndLoss.mockResolvedValue([
      { type: 'INVOICE', totalAmount: 500, issueDate: new Date('2026-02-01') },
      { type: 'INVOICE', totalAmount: 300, issueDate: new Date('2026-01-01') },
    ]);

    const report = await build(deps).profitAndLoss('tenant-1', new Date('2026-01-01'), new Date('2026-02-28'));

    expect(report.byMonth.map((m) => m.month)).toEqual(['2026-01', '2026-02']);
    expect(report.byMonth[0].revenue).toBe(300);
    expect(report.byMonth[1].revenue).toBe(500);
  });
});
