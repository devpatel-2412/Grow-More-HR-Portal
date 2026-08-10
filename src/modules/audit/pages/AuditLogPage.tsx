import { ScrollText } from 'lucide-react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLogTable } from '../components/AuditLogTable';
import { usePagination } from '../../../shared/hooks/usePagination';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function AuditLogPage() {
  const pagination = usePagination(25);
  const { data, isLoading, isError, refetch } = useAuditLogs({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Audit log"
      subtitle="Security-relevant activity for your workspace. Actor IDs are shown, not names — see Team for the full directory."
      state={state}
      errorProps={{ description: 'Failed to load the audit log.', onRetry: () => refetch() }}
      emptyProps={{ icon: ScrollText, title: 'No activity yet', description: 'Security-relevant actions will appear here.' }}
    >
      {data && (
        <div className="space-y-4">
          <AuditLogTable entries={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
