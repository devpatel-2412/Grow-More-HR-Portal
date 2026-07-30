import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '../api/tenant.api';
import type { UpdateTenantFormValues } from '../schemas/tenant.schemas';

export function useUpdateTenant(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: UpdateTenantFormValues) => tenantApi.update(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
