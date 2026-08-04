import { api } from '../../../shared/lib/api-client';
import type { BranchRecord, TeamRecord } from '../types/organization.types';

export interface CreateBranchPayload {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isHeadOffice?: boolean;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
  branchId?: string;
  leadId?: string;
}

export const branchApi = {
  list: (query: { page: number; limit: number; search?: string; sort?: string }) =>
    api.getPaginated<BranchRecord>('/branches', query),
  create: (payload: CreateBranchPayload) => api.post<BranchRecord>('/branches', payload),
  update: (id: string, payload: Partial<CreateBranchPayload>) => api.patch<BranchRecord>(`/branches/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/branches/${id}`),
};

export const teamApi = {
  list: (query: { page: number; limit: number; search?: string; sort?: string; branchId?: string }) =>
    api.getPaginated<TeamRecord>('/teams', query),
  create: (payload: CreateTeamPayload) => api.post<TeamRecord>('/teams', payload),
  update: (
    id: string,
    payload: Omit<Partial<CreateTeamPayload>, 'branchId' | 'leadId'> & { branchId?: string | null; leadId?: string | null },
  ) => api.patch<TeamRecord>(`/teams/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/teams/${id}`),
};
