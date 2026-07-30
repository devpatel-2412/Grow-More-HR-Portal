import { CalendarOff } from 'lucide-react';
import { useMyLeave } from '../hooks/useMyLeave';
import { usePagination } from '../../../shared/hooks/usePagination';
import { LeaveRequestDialog } from '../components/LeaveRequestDialog';
import { LeaveHistoryTable } from '../components/LeaveHistoryTable';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function LeavePage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useMyLeave({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Leave</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Request time off and track your approval status.</p>
        </div>
        <LeaveRequestDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load your leave history." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={CalendarOff} title="No leave requests yet" description="Submit your first request to get started." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <LeaveHistoryTable records={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
