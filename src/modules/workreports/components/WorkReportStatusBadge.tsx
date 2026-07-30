import { Badge } from '../../../shared/components/ui/badge';
import type { WorkReportStatus } from '../types/workreport.types';

const VARIANT: Record<WorkReportStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const LABEL: Record<WorkReportStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function WorkReportStatusBadge({ status }: { status: WorkReportStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
