import { ClipboardCheck } from 'lucide-react';
import { useWorkReportReviewQueue } from '../hooks/useWorkReports';
import { usePagination } from '../../../shared/hooks/usePagination';
import { WorkReportReviewTable } from '../components/WorkReportReviewTable';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function WorkReportReviewPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useWorkReportReviewQueue({
    page: pagination.page,
    limit: pagination.limit,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Report reviews</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Daily reports waiting on your approval.</p>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load the review queue." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={ClipboardCheck} title="Nothing to review" description="You are all caught up." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <WorkReportReviewTable reports={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
