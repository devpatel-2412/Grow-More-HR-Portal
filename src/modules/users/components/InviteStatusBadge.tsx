import { Badge } from '../../../shared/components/ui/badge';
import type { InviteStatus } from '../types/user.types';

const INVITE_STATUS_VARIANT: Record<InviteStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  EXPIRED: 'neutral',
  REVOKED: 'danger',
};

export function InviteStatusBadge({ status }: { status: InviteStatus }) {
  return <Badge variant={INVITE_STATUS_VARIANT[status]}>{status}</Badge>;
}
