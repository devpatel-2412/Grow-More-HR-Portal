import { api } from '../../../shared/lib/api-client';
import type { CreateEmployeeFormValues, UpdateEmployeeFormValues } from '../schemas/employee.schemas';
import type { EmployeeListItem } from '../types/employee.types';

export interface ListEmployeesQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  department?: string;
  status?: string;
}

export const employeeApi = {
  list: (query: ListEmployeesQuery) => api.getPaginated<EmployeeListItem>('/employees', query),
  get: (id: string) => api.get<EmployeeListItem>(`/employees/${id}`),
  create: (values: CreateEmployeeFormValues) =>
    api.post<EmployeeListItem>('/employees', { ...values, phone: values.phone || undefined }),
  update: (
    id: string,
    values: Omit<Partial<UpdateEmployeeFormValues>, 'branchId' | 'teamId'> & { branchId?: string | null; teamId?: string | null },
  ) => api.patch<EmployeeListItem>(`/employees/${id}`, { ...values, phone: values.phone || undefined }),
  getMe: () => api.get<EmployeeListItem>('/employees/me'),
  updateProfile: (values: { phone?: string; address?: string; emergencyContact?: string }) =>
    api.patch<EmployeeListItem>('/employees/me/profile', values),
};
