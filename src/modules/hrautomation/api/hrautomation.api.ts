import { api, apiDownload } from '../../../shared/lib/api-client';
import type { TemplateRecord, GeneratedDocumentRecord, AnnouncementRecord, TemplateType, LayoutField, AnnouncementAudience } from '../types/hrautomation.types';

export interface CreateTemplatePayload {
  name: string;
  type: TemplateType;
  backgroundUrl?: string;
  layoutFields?: LayoutField[];
  bodyTemplate?: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  department?: string;
}

export const templateApi = {
  create: (payload: CreateTemplatePayload) => api.post<TemplateRecord>('/templates', payload),
  list: (query: { page: number; limit: number; type?: TemplateType }) => api.getPaginated<TemplateRecord>('/templates', query),
  get: (id: string) => api.get<TemplateRecord>(`/templates/${id}`),
  update: (id: string, payload: Partial<CreateTemplatePayload>) => api.patch<TemplateRecord>(`/templates/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/templates/${id}`),
  generate: (id: string, employeeId: string) => api.post<GeneratedDocumentRecord>(`/templates/${id}/generate`, { employeeId }),
  listGenerated: (query: { page: number; limit: number; employeeId?: string }) =>
    api.getPaginated<GeneratedDocumentRecord>('/templates/generated-documents', query),
  downloadPdf: (documentId: string) => apiDownload(`/templates/generated-documents/${documentId}/pdf`),
  downloadDocx: (documentId: string) => apiDownload(`/templates/generated-documents/${documentId}/docx`),
  emailDocument: (documentId: string) => api.post<{ to: string }>(`/templates/generated-documents/${documentId}/email`),
};

export const announcementApi = {
  publish: (payload: CreateAnnouncementPayload) => api.post<AnnouncementRecord>('/announcements', payload),
  list: (query: { page: number; limit: number }) => api.getPaginated<AnnouncementRecord>('/announcements', query),
  remove: (id: string) => api.delete<void>(`/announcements/${id}`),
};

export interface DocumentVerificationResult {
  valid: boolean;
  documentType: string;
  employeeName: string;
  companyName: string;
  issuedDate: string;
}

/** Public — no tenant login required, matches the unauthenticated /api/v1/verify/documents/:id endpoint. */
export const verifyApi = {
  verifyDocument: (id: string) => api.get<DocumentVerificationResult>(`/verify/documents/${id}`),
};
