import { api } from '../../../shared/lib/api-client';
import type { UpdateTenantFormValues } from '../schemas/tenant.schemas';
import type { Tenant } from '../../auth/types/auth.types';

export const tenantApi = {
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  update: (id: string, values: UpdateTenantFormValues) =>
    api.patch<Tenant>(`/tenants/${id}`, { ...values, logoUrl: values.logoUrl || undefined }),
};
