import { useQuery } from '@tanstack/react-query';
import { tenantApi, type ListTenantsQuery } from '../api/tenant.api';

export function useTenants(query: ListTenantsQuery) {
  return useQuery({
    queryKey: ['tenants', query],
    queryFn: () => tenantApi.list(query),
    placeholderData: (previous) => previous,
  });
}
