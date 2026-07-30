import { api } from '../../../shared/lib/api-client';
import type { PayrollRunRecord, PayrollItemRecord, SalaryStructureRecord, PayrollStatus } from '../types/payroll.types';

export interface SetSalaryStructurePayload {
  employeeId: string;
  effectiveFrom: string;
  basicSalary: number;
  hra: number;
  allowance: number;
}

export const payrollApi = {
  setSalaryStructure: (payload: SetSalaryStructurePayload) =>
    api.post<SalaryStructureRecord>('/payroll/salary-structures', payload),
  listSalaryStructures: (query: { page: number; limit: number; employeeId?: string }) =>
    api.getPaginated<SalaryStructureRecord>('/payroll/salary-structures', query),

  generateRun: (month: number, year: number) => api.post<PayrollRunRecord>('/payroll/runs', { month, year }),
  listRuns: (query: { page: number; limit: number; year?: number; status?: PayrollStatus }) =>
    api.getPaginated<PayrollRunRecord>('/payroll/runs', query),
  getRun: (id: string) => api.get<PayrollRunRecord>(`/payroll/runs/${id}`),
  approveRun: (id: string) => api.post<PayrollRunRecord>(`/payroll/runs/${id}/approve`),
  markRunPaid: (id: string) => api.post<PayrollRunRecord>(`/payroll/runs/${id}/mark-paid`),
  cancelRun: (id: string) => api.post<PayrollRunRecord>(`/payroll/runs/${id}/cancel`),

  updatePayslip: (id: string, payload: { bonus?: number; overtimeHours?: number }) =>
    api.patch<PayrollItemRecord>(`/payroll/payslips/${id}`, payload),
  listPayslips: (query: { page: number; limit: number; employeeId?: string; month?: number; year?: number }) =>
    api.getPaginated<PayrollItemRecord>('/payroll/payslips', query),
};
