import { Badge } from '../../../shared/components/ui/badge';
import type { AssetStatus } from '../types/workplace.types';

const VARIANT: Record<AssetStatus, 'success' | 'info' | 'warning' | 'danger'> = {
  AVAILABLE: 'success',
  ASSIGNED: 'info',
  UNDER_REPAIR: 'warning',
  RETIRED: 'danger',
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <Badge variant={VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
