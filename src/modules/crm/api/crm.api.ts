import { api } from '../../../shared/lib/api-client';
import type { LeadRecord, CrmActivityRecord, LeadPipelineRow, LeadStatus, CrmActivityType } from '../types/crm.types';

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

export interface LogActivityPayload {
  type: CrmActivityType;
  subject: string;
  body?: string;
  occurredAt: string;
  leadId: string;
}

export const crmApi = {
  createLead: (payload: CreateLeadPayload) => api.post<LeadRecord>('/leads', payload),
  listLeads: (query: { page: number; limit: number; status?: LeadStatus; search?: string }) =>
    api.getPaginated<LeadRecord>('/leads', query),
  getLead: (id: string) => api.get<LeadRecord>(`/leads/${id}`),
  changeLeadStage: (id: string, status: LeadStatus, lostReason?: string) =>
    api.patch<LeadRecord>(`/leads/${id}/stage`, { status, lostReason }),
  leadPipeline: () => api.get<LeadPipelineRow[]>('/leads/pipeline'),

  logActivity: (payload: LogActivityPayload) => api.post<CrmActivityRecord>('/crm-activities', payload),
  listActivities: (query: { page: number; limit: number; leadId?: string }) =>
    api.getPaginated<CrmActivityRecord>('/crm-activities', query),
};
