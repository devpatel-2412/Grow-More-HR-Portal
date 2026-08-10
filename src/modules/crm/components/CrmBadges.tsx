import { Badge } from '../../../shared/components/ui/badge';
import type { LeadStatus } from '../types/crm.types';

const LEAD_VARIANT: Record<LeadStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  NEW: 'neutral',
  CONTACTED: 'info',
  QUALIFIED: 'info',
  PROPOSAL: 'warning',
  WON: 'success',
  LOST: 'danger',
};

export const LEAD_STAGE_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={LEAD_VARIANT[status]}>{LEAD_STAGE_LABEL[status]}</Badge>;
}
