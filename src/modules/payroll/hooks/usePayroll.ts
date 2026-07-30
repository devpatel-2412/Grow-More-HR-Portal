import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type SetSalaryStructurePayload } from '../api/payroll.api';
import type { PayrollStatus } from '../types/payroll.types';

const PAYROLL_KEY = ['payroll'];

export function usePayrollRuns(query: { page: number; limit: number; year?: number; status?: PayrollStatus }) {
  return useQuery({
    queryKey: ['payroll', 'runs', query],
    queryFn: () => payrollApi.listRuns(query),
    placeholderData: (previous) => previous,
  });
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll', 'run', id],
    queryFn: () => payrollApi.getRun(id!),
    enabled: !!id,
  });
}

export function usePayslips(query: { page: number; limit: number; employeeId?: string; month?: number; year?: number }) {
  return useQuery({
    queryKey: ['payroll', 'payslips', query],
    queryFn: () => payrollApi.listPayslips(query),
    placeholderData: (previous) => previous,
  });
}

export function useSalaryStructures(query: { page: number; limit: number; employeeId?: string }) {
  return useQuery({
    queryKey: ['payroll', 'structures', query],
    queryFn: () => payrollApi.listSalaryStructures(query),
    placeholderData: (previous) => previous,
  });
}

export function useSetSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetSalaryStructurePayload) => payrollApi.setSalaryStructure(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY }),
  });
}

export function useGeneratePayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => payrollApi.generateRun(month, year),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY }),
  });
}

export function usePayrollRunTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'mark-paid' | 'cancel' }) => {
      if (action === 'approve') return payrollApi.approveRun(id);
      if (action === 'mark-paid') return payrollApi.markRunPaid(id);
      return payrollApi.cancelRun(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY }),
  });
}

export function useUpdatePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; bonus?: number; overtimeHours?: number }) =>
      payrollApi.updatePayslip(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY }),
  });
}
