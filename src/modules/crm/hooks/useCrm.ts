import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi, type CreateLeadPayload, type LogActivityPayload } from '../api/crm.api';
import type { LeadStatus } from '../types/crm.types';

const CRM_KEY = ['crm'];

export function useLeads(query: { page: number; limit: number; status?: LeadStatus; search?: string }) {
  return useQuery({
    queryKey: ['crm', 'leads', query],
    queryFn: () => crmApi.listLeads(query),
    placeholderData: (previous) => previous,
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['crm', 'lead', id],
    queryFn: () => crmApi.getLead(id!),
    enabled: !!id,
  });
}

export function useLeadPipeline() {
  return useQuery({ queryKey: ['crm', 'pipeline'], queryFn: () => crmApi.leadPipeline() });
}

export function useActivities(query: { page: number; limit: number; leadId?: string }) {
  return useQuery({
    queryKey: ['crm', 'activities', query],
    queryFn: () => crmApi.listActivities(query),
    enabled: !!query.leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => crmApi.createLead(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CRM_KEY }),
  });
}

export function useChangeLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, lostReason }: { id: string; status: LeadStatus; lostReason?: string }) =>
      crmApi.changeLeadStage(id, status, lostReason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CRM_KEY }),
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LogActivityPayload) => crmApi.logActivity(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CRM_KEY }),
  });
}
