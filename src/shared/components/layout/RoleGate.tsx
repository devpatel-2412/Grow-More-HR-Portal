import type { ReactNode } from 'react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import type { UserRole } from '../../../modules/auth/types/auth.types';

interface RoleGateProps {
  allow: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** UI-level counterpart to the backend's requireRole/requirePermission guards — hides actions the user can't perform, never the sole enforcement (the API always re-checks). */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
