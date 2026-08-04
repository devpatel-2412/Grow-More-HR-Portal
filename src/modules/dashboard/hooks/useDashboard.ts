import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { useAuth } from '../../auth/context/AuthContext';

const ADMIN_DASHBOARD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'];

/** Only fetches for roles that actually hold dashboard:read:tenant server-side — avoids a guaranteed 403 for everyone else. */
export function useAdminSummary() {
  const { user } = useAuth();
  const enabled = !!user && ADMIN_DASHBOARD_ROLES.includes(user.role);
  return useQuery({
    queryKey: ['dashboard', 'admin-summary'],
    queryFn: () => dashboardApi.getAdminSummary(),
    enabled,
  });
}
