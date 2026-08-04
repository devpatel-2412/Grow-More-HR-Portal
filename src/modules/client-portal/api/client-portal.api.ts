import { api } from '../../../shared/lib/api-client';
import type { OwnClientProfile } from '../types/client-portal.types';
import type { FinanceDocumentRecord, FinanceType, FinanceStatus } from '../../finance/types/finance.types';
import type { ProjectRecord, ProjectStatus } from '../../projects/types/project.types';

export const clientPortalApi = {
  getProfile: () => api.get<OwnClientProfile>('/client-portal/me'),
  listFinanceDocuments: (query: { page: number; limit: number; sort?: string; type?: FinanceType; status?: FinanceStatus }) =>
    api.getPaginated<FinanceDocumentRecord>('/client-portal/finance-documents', query),
  getFinanceDocument: (id: string) => api.get<FinanceDocumentRecord>(`/client-portal/finance-documents/${id}`),
  listProjects: (query: { page: number; limit: number; sort?: string; status?: ProjectStatus }) =>
    api.getPaginated<ProjectRecord>('/client-portal/projects', query),
};
