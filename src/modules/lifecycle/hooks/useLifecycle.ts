import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi, lifecycleApi, fnfApi, type FnfPayload } from '../api/lifecycle.api';
import { ApiError } from '../../../shared/lib/api-client';
import type { FnfStatus } from '../types/lifecycle.types';

// ---------------------------------------------------------------- checklist

export function useChecklist(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['lifecycle', 'checklist', employeeId],
    queryFn: () => checklistApi.list(employeeId!),
    enabled: !!employeeId,
  });
}

export function useCreateChecklistItem(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => checklistApi.create(employeeId, label),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lifecycle', 'checklist', employeeId] }),
  });
}

export function useUpdateChecklistItem(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: { label?: string; isCompleted?: boolean } }) =>
      checklistApi.update(itemId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lifecycle', 'checklist', employeeId] }),
  });
}

export function useDeleteChecklistItem(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => checklistApi.remove(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lifecycle', 'checklist', employeeId] }),
  });
}

// ---------------------------------------------------------------- lifecycle events

export function useLifecycleEvents(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['lifecycle', 'events', employeeId],
    queryFn: () => lifecycleApi.listEvents(employeeId!),
    enabled: !!employeeId,
  });
}

function invalidateEmployeeState(queryClient: ReturnType<typeof useQueryClient>, employeeId: string) {
  queryClient.invalidateQueries({ queryKey: ['lifecycle', 'events', employeeId] });
  queryClient.invalidateQueries({ queryKey: ['employees'] });
}

export function useConfirmEmployee(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { effectiveDate: string; notes?: string }) => lifecycleApi.confirm(employeeId, payload),
    onSuccess: () => invalidateEmployeeState(queryClient, employeeId),
  });
}

export function usePromoteEmployee(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { effectiveDate: string; newDesignation: string; newDepartment?: string; notes?: string }) =>
      lifecycleApi.promote(employeeId, payload),
    onSuccess: () => invalidateEmployeeState(queryClient, employeeId),
  });
}

export function useTransferEmployee(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      effectiveDate: string;
      branchId?: string | null;
      teamId?: string | null;
      managerId?: string | null;
      notes?: string;
    }) => lifecycleApi.transfer(employeeId, payload),
    onSuccess: () => invalidateEmployeeState(queryClient, employeeId),
  });
}

export function useInitiateExit(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { effectiveDate: string; reason?: string; notes?: string }) => lifecycleApi.initiateExit(employeeId, payload),
    onSuccess: () => invalidateEmployeeState(queryClient, employeeId),
  });
}

export function useCompleteExit(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { effectiveDate: string; outcome: 'TERMINATED' | 'RESIGNED'; notes?: string }) =>
      lifecycleApi.completeExit(employeeId, payload),
    onSuccess: () => invalidateEmployeeState(queryClient, employeeId),
  });
}

// ---------------------------------------------------------------- F&F settlement

export function useFnfSettlement(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['lifecycle', 'fnf', employeeId],
    queryFn: async () => {
      try {
        return await fnfApi.get(employeeId!);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!employeeId,
  });
}

export function useCreateFnfSettlement(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FnfPayload) => fnfApi.create(employeeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lifecycle', 'fnf', employeeId] }),
  });
}

export function useUpdateFnfSettlement(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FnfPayload) => fnfApi.update(employeeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lifecycle', 'fnf', employeeId] }),
  });
}

export function useChangeFnfStatus(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: FnfStatus) => fnfApi.changeStatus(employeeId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lifecycle', 'fnf', employeeId] }),
  });
}
