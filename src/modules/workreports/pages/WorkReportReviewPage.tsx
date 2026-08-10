import { ClipboardCheck } from 'lucide-react';
import { useWorkReportReviewQueue } from '../hooks/useWorkReports';
import { usePagination } from '../../../shared/hooks/usePagination';
import { WorkReportReviewTable } from '../components/WorkReportReviewTable';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function WorkReportReviewPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useWorkReportReviewQueue({
    page: pagination.page,
    limit: pagination.limit,
  });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Report reviews"
      subtitle="Daily reports waiting on your approval."
      maxWidth="6xl"
      state={state}
      errorProps={{ description: 'Failed to load the review queue.', onRetry: () => refetch() }}
      emptyProps={{ icon: ClipboardCheck, title: 'Nothing to review', description: 'You are all caught up.' }}
    >
      {data && (
        <div className="space-y-4">
          <WorkReportReviewTable reports={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
