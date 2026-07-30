import { api } from '../../../shared/lib/api-client';
import type { AuditLogEntry } from '../types/audit.types';

export interface ListAuditLogsQuery {
  page: number;
  limit: number;
  action?: string;
}

export const auditApi = {
  list: (query: ListAuditLogsQuery) => api.getPaginated<AuditLogEntry>('/audit-logs', query),
};
