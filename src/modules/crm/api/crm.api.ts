import { api } from '../../../shared/lib/api-client';
import type {
  LeadRecord,
  ClientRecord,
  ClientContactRecord,
  CrmActivityRecord,
  LeadPipelineRow,
  LeadStatus,
  ClientStatus,
  CrmActivityType,
} from '../types/crm.types';

export interface CreateLeadPayload {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  source?: string;
  estimatedValue: number;
  ownerId?: string;
  notes?: string;
}

export interface ConvertLeadPayload {
  industry?: string;
  website?: string;
  address?: string;
  accountManagerId?: string;
}

export interface CreateClientPayload {
  companyName: string;
  contactEmail: string;
  phone?: string;
  website?: string;
  address?: string;
  industry?: string;
  accountManagerId?: string;
  notes?: string;
}

export interface CreateContactPayload {
  name: string;
  email: string;
  phone?: string;
  designation?: string;
  isPrimary: boolean;
}

export interface LogActivityPayload {
  type: CrmActivityType;
  subject: string;
  body?: string;
  occurredAt: string;
  leadId?: string;
  clientId?: string;
}

export const crmApi = {
  createLead: (payload: CreateLeadPayload) => api.post<LeadRecord>('/leads', payload),
  listLeads: (query: { page: number; limit: number; status?: LeadStatus; search?: string }) =>
    api.getPaginated<LeadRecord>('/leads', query),
  getLead: (id: string) => api.get<LeadRecord>(`/leads/${id}`),
  changeLeadStage: (id: string, status: LeadStatus, lostReason?: string) =>
    api.patch<LeadRecord>(`/leads/${id}/stage`, { status, lostReason }),
  convertLead: (id: string, payload: ConvertLeadPayload) => api.post<ClientRecord>(`/leads/${id}/convert`, payload),
  leadPipeline: () => api.get<LeadPipelineRow[]>('/leads/pipeline'),

  createClient: (payload: CreateClientPayload) => api.post<ClientRecord>('/clients', payload),
  listClients: (query: { page: number; limit: number; status?: ClientStatus; search?: string }) =>
    api.getPaginated<ClientRecord>('/clients', query),
  getClient: (id: string) => api.get<ClientRecord>(`/clients/${id}`),
  addContact: (clientId: string, payload: CreateContactPayload) =>
    api.post<ClientContactRecord>(`/clients/${clientId}/contacts`, payload),

  logActivity: (payload: LogActivityPayload) => api.post<CrmActivityRecord>('/crm-activities', payload),
  listActivities: (query: { page: number; limit: number; leadId?: string; clientId?: string }) =>
    api.getPaginated<CrmActivityRecord>('/crm-activities', query),
};
