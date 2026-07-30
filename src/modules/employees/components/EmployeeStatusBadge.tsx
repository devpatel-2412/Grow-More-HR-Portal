import { Badge } from '../../../shared/components/ui/badge';
import type { EmployeeStatus } from '../types/employee.types';

const STATUS_VARIANT: Record<EmployeeStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  ACTIVE: 'success',
  ONBOARDING: 'info',
  OFFBOARDING: 'warning',
  TERMINATED: 'danger',
  RESIGNED: 'neutral',
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
