import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  crmApi,
  type CreateLeadPayload,
  type ConvertLeadPayload,
  type CreateClientPayload,
  type CreateContactPayload,
  type LogActivityPayload,
} from '../api/crm.api';
import type { LeadStatus, ClientStatus } from '../types/crm.types';

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

export function useClients(query: { page: number; limit: number; status?: ClientStatus; search?: string }) {
  return useQuery({
    queryKey: ['crm', 'clients', query],
    queryFn: () => crmApi.listClients(query),
    placeholderData: (previous) => previous,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['crm', 'client', id],
    queryFn: () => crmApi.getClient(id!),
    enabled: !!id,
  });
}

export function useActivities(query: { page: number; limit: number; leadId?: string; clientId?: string }) {
  return useQuery({
    queryKey: ['crm', 'activities', query],
    queryFn: () => crmApi.listActivities(query),
    enabled: !!(query.leadId || query.clientId),
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

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConvertLeadPayload }) => crmApi.convertLead(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CRM_KEY }),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientPayload) => crmApi.createClient(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CRM_KEY }),
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, payload }: { clientId: string; payload: CreateContactPayload }) =>
      crmApi.addContact(clientId, payload),
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
