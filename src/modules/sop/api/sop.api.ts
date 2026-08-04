import { api } from '../../../shared/lib/api-client';
import type { SopRecord, SopRevisionRecord, SopStatus } from '../types/sop.types';

export interface CreateSopPayload {
  title: string;
  category?: string;
  department?: string;
  body: string;
  fileUrl?: string;
  ownerId?: string;
}

export const sopApi = {
  list: (query: { page: number; limit: number; search?: string; sort?: string; status?: SopStatus; category?: string; department?: string }) =>
    api.getPaginated<SopRecord>('/sops', query),
  get: (id: string) => api.get<SopRecord>(`/sops/${id}`),
  create: (payload: CreateSopPayload) => api.post<SopRecord>('/sops', payload),
  update: (id: string, payload: Omit<Partial<CreateSopPayload>, 'ownerId'> & { ownerId?: string | null }) =>
    api.patch<SopRecord>(`/sops/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/sops/${id}`),
  publish: (id: string) => api.post<SopRecord>(`/sops/${id}/publish`),
  archive: (id: string) => api.post<SopRecord>(`/sops/${id}/archive`),
  listRevisions: (id: string) => api.get<SopRevisionRecord[]>(`/sops/${id}/revisions`),
};
