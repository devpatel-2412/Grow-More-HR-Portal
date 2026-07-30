import { useQuery } from '@tanstack/react-query';
import { auditApi, type ListAuditLogsQuery } from '../api/audit.api';

export function useAuditLogs(query: ListAuditLogsQuery) {
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditApi.list(query),
    placeholderData: (previous) => previous,
  });
}
