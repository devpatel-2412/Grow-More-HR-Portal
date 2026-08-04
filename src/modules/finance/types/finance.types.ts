export type FinanceType = 'QUOTATION' | 'INVOICE' | 'EXPENSE' | 'BILL';
export type FinanceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';

export interface FinanceLineItemRecord {
  id: string;
  description: string;
  hsnCode: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface FinancePaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  reference: string | null;
}

export interface FinanceDocumentRecord {
  id: string;
  tenantId: string;
  type: FinanceType;
  number: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  placeOfSupplyStateCode: string | null;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  amountPaid: number;
  notes: string | null;
  status: FinanceStatus;
  clientPortalId: string | null;
  projectId: string | null;
  createdAt: string;
  lineItems?: FinanceLineItemRecord[];
  payments?: FinancePaymentRecord[];
}

export interface FinanceSummaryRow {
  type: FinanceType;
  status: FinanceStatus;
  count: number;
  totalAmount: number;
  amountPaid: number;
}

export interface ProfitAndLossMonth {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface ProfitAndLossReport {
  from: string;
  to: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  byMonth: ProfitAndLossMonth[];
}
