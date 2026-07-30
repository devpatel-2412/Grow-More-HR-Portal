import { Badge } from '../../../shared/components/ui/badge';
import type { LeaveStatus } from '../types/leave.types';

const STATUS_VARIANT: Record<LeaveStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PENDING_MANAGER: 'warning',
  PENDING_HR: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING_MANAGER: 'Pending manager',
  PENDING_HR: 'Pending HR',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
