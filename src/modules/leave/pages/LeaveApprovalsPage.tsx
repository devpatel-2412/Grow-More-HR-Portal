import { ClipboardCheck } from 'lucide-react';
import { useLeaveApprovalQueue } from '../hooks/useLeaveApprovalQueue';
import { usePagination } from '../../../shared/hooks/usePagination';
import { LeaveApprovalTable } from '../components/LeaveApprovalTable';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function LeaveApprovalsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useLeaveApprovalQueue({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Leave Approvals</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Requests from your direct reports, plus HR-stage requests if you hold that permission.
        </p>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load the approval queue." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={ClipboardCheck} title="Nothing to review" description="Your leave approval queue is empty." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <LeaveApprovalTable records={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
