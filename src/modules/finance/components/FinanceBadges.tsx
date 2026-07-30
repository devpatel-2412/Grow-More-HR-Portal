import { Badge } from '../../../shared/components/ui/badge';
import type { FinanceStatus, FinanceType } from '../types/finance.types';

const STATUS_VARIANT: Record<FinanceStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PAID: 'success',
  OVERDUE: 'danger',
  VOID: 'neutral',
};

export const TYPE_LABEL: Record<FinanceType, string> = {
  QUOTATION: 'Quotation',
  INVOICE: 'Invoice',
  EXPENSE: 'Expense',
  BILL: 'Bill',
};

export function FinanceStatusBadge({ status }: { status: FinanceStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

export function formatMoney(value: number, currency = 'USD'): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
