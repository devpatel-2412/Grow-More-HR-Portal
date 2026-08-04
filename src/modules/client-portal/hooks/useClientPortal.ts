import { useQuery } from '@tanstack/react-query';
import { clientPortalApi } from '../api/client-portal.api';
import type { FinanceType, FinanceStatus } from '../../finance/types/finance.types';
import type { ProjectStatus } from '../../projects/types/project.types';

export function useOwnClientProfile() {
  return useQuery({
    queryKey: ['client-portal', 'profile'],
    queryFn: () => clientPortalApi.getProfile(),
  });
}

export function useOwnFinanceDocuments(query: { page: number; limit: number; sort?: string; type?: FinanceType; status?: FinanceStatus }) {
  return useQuery({
    queryKey: ['client-portal', 'finance-documents', query],
    queryFn: () => clientPortalApi.listFinanceDocuments(query),
    placeholderData: (previous) => previous,
  });
}

export function useOwnFinanceDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['client-portal', 'finance-document', id],
    queryFn: () => clientPortalApi.getFinanceDocument(id!),
    enabled: !!id,
  });
}

export function useOwnProjects(query: { page: number; limit: number; sort?: string; status?: ProjectStatus }) {
  return useQuery({
    queryKey: ['client-portal', 'projects', query],
    queryFn: () => clientPortalApi.listProjects(query),
    placeholderData: (previous) => previous,
  });
}
