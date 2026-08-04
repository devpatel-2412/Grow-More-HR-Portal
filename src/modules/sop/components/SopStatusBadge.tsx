import { Badge } from '../../../shared/components/ui/badge';
import type { SopStatus } from '../types/sop.types';

const STATUS_VARIANT: Record<SopStatus, 'neutral' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'danger',
};

export function SopStatusBadge({ status }: { status: SopStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
