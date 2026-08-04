import { Outlet } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import type { UserRole } from '../../../modules/auth/types/auth.types';
import { ForbiddenPage } from '../feedback/ForbiddenPage';

interface RequireRoleProps {
  allow: UserRole[];
}

/** Route-level counterpart to `RoleGate` — enforces the same policy against direct URL navigation, not just hidden nav links. */
export function RequireRole({ allow }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}
