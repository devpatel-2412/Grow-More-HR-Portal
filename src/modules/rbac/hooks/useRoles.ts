import { useQuery } from '@tanstack/react-query';
import { rbacApi } from '../api/rbac.api';

export function useRoles() {
  return useQuery({
    queryKey: ['rbac', 'roles'],
    queryFn: () => rbacApi.listRoles(),
  });
}

/** The full assignable-permission catalogue — static across a session, so a long staleTime avoids
 * re-fetching it every time the permission matrix dialog opens. */
export function usePermissionCatalogue() {
  return useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: () => rbacApi.listPermissions(),
    staleTime: 10 * 60 * 1000,
  });
}
