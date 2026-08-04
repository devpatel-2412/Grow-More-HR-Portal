import { api } from '../../../shared/lib/api-client';
import type { ChecklistItemRecord, LifecycleEventRecord, FnfSettlementRecord, FnfStatus } from '../types/lifecycle.types';

export const checklistApi = {
  list: (employeeId: string) => api.get<ChecklistItemRecord[]>(`/employees/${employeeId}/checklist`),
  create: (employeeId: string, label: string) =>
    api.post<ChecklistItemRecord>(`/employees/${employeeId}/checklist`, { label }),
  update: (itemId: string, payload: { label?: string; isCompleted?: boolean }) =>
    api.patch<ChecklistItemRecord>(`/checklist-items/${itemId}`, payload),
  remove: (itemId: string) => api.delete<void>(`/checklist-items/${itemId}`),
};

export const lifecycleApi = {
  listEvents: (employeeId: string) => api.get<LifecycleEventRecord[]>(`/employees/${employeeId}/lifecycle-events`),
  confirm: (employeeId: string, payload: { effectiveDate: string; notes?: string }) =>
    api.post(`/employees/${employeeId}/confirm`, payload),
  promote: (employeeId: string, payload: { effectiveDate: string; newDesignation: string; newDepartment?: string; notes?: string }) =>
    api.post(`/employees/${employeeId}/promote`, payload),
  transfer: (
    employeeId: string,
    payload: { effectiveDate: string; branchId?: string | null; teamId?: string | null; managerId?: string | null; notes?: string },
  ) => api.post(`/employees/${employeeId}/transfer`, payload),
  initiateExit: (employeeId: string, payload: { effectiveDate: string; reason?: string; notes?: string }) =>
    api.post(`/employees/${employeeId}/exit/initiate`, payload),
  completeExit: (employeeId: string, payload: { effectiveDate: string; outcome: 'TERMINATED' | 'RESIGNED'; notes?: string }) =>
    api.post(`/employees/${employeeId}/exit/complete`, payload),
};

export interface FnfPayload {
  lastWorkingDay: string;
  pendingSalary: number;
  leaveEncashment: number;
  bonus: number;
  deductions: number;
  notes?: string;
}

export const fnfApi = {
  get: (employeeId: string) => api.get<FnfSettlementRecord>(`/employees/${employeeId}/fnf-settlement`),
  create: (employeeId: string, payload: FnfPayload) => api.post<FnfSettlementRecord>(`/employees/${employeeId}/fnf-settlement`, payload),
  update: (employeeId: string, payload: FnfPayload) => api.patch<FnfSettlementRecord>(`/employees/${employeeId}/fnf-settlement`, payload),
  changeStatus: (employeeId: string, status: FnfStatus) =>
    api.patch<FnfSettlementRecord>(`/employees/${employeeId}/fnf-settlement/status`, { status }),
};
