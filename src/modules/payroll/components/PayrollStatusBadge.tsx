import { Badge } from '../../../shared/components/ui/badge';
import type { PayrollStatus } from '../types/payroll.types';

const VARIANT: Record<PayrollStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  DRAFT: 'warning',
  APPROVED: 'info',
  PAID: 'success',
  CANCELLED: 'danger',
};

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
