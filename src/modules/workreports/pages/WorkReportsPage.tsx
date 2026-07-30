import { ClipboardList } from 'lucide-react';
import { useWorkReports } from '../hooks/useWorkReports';
import { usePagination } from '../../../shared/hooks/usePagination';
import { WorkReportDialog } from '../components/WorkReportDialog';
import { WorkReportTable } from '../components/WorkReportTable';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function WorkReportsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useWorkReports({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Work reports</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Log what you shipped each day and track your review status.
          </p>
        </div>
        <WorkReportDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load your work reports." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="No work reports yet"
            description="Submit today's report to start building your history."
          />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <WorkReportTable reports={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
