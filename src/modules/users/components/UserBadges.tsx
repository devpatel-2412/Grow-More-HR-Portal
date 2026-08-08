import { Badge } from '../../../shared/components/ui/badge';
import type { UserRole, UserStatus } from '../../auth/types/auth.types';

const ROLE_VARIANT: Record<UserRole, 'info' | 'success' | 'neutral'> = {
  SUPER_ADMIN: 'success',
  ADMIN: 'info',
  HR_MANAGER: 'info',
  HR_EXECUTIVE: 'info',
  PROJECT_MANAGER: 'info',
  TEAM_LEADER: 'info',
  EMPLOYEE: 'neutral',
  CLIENT: 'neutral',
  RECRUITER: 'info',
  FINANCE: 'info',
  ACCOUNTS: 'info',
  CANDIDATE: 'neutral',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={ROLE_VARIANT[role]}>{role.replace('_', ' ')}</Badge>;
}

const STATUS_VARIANT: Record<UserStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  PENDING_INVITE: 'warning',
  SUSPENDED: 'danger',
  DEACTIVATED: 'neutral',
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
