import { api } from '../../../shared/lib/api-client';
import type { UpdateTenantFormValues, CreateCompanyFormValues } from '../schemas/tenant.schemas';
import type { Tenant } from '../../auth/types/auth.types';

export interface ListTenantsQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
}

export const tenantApi = {
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  list: (query: ListTenantsQuery) => api.getPaginated<Tenant>('/tenants', query),
  create: (values: CreateCompanyFormValues) => api.post<Tenant>('/tenants', values),
  update: (id: string, values: UpdateTenantFormValues) =>
    api.patch<Tenant>(`/tenants/${id}`, {
      ...values,
      logoUrl: values.logoUrl || undefined,
      gstin: values.gstin || undefined,
      gstStateCode: values.gstStateCode || undefined,
    }),
};
