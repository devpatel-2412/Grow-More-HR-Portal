import { ClipboardList } from 'lucide-react';
import { useWorkReports } from '../hooks/useWorkReports';
import { usePagination } from '../../../shared/hooks/usePagination';
import { WorkReportDialog } from '../components/WorkReportDialog';
import { WorkReportTable } from '../components/WorkReportTable';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function WorkReportsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useWorkReports({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Work reports"
      subtitle="Log what you shipped each day and track your review status."
      actions={<WorkReportDialog />}
      state={state}
      errorProps={{ description: 'Failed to load your work reports.', onRetry: () => refetch() }}
      emptyProps={{ icon: ClipboardList, title: 'No work reports yet', description: "Submit today's report to start building your history." }}
    >
      {data && (
        <div className="space-y-4">
          <WorkReportTable reports={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
