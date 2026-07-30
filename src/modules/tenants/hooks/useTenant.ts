import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../api/tenant.api';

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantApi.get(id!),
    enabled: !!id,
  });
}
