import { Badge } from '../../../shared/components/ui/badge';
import type { TicketStatus } from '../types/workplace.types';

const VARIANT: Record<TicketStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  OPEN: 'neutral',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'danger',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
