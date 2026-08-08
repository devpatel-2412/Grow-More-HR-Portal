import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '../api/tenant.api';
import type { CreateCompanyFormValues } from '../schemas/tenant.schemas';

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateCompanyFormValues) => tenantApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
