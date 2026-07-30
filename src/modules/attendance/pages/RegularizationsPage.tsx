import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useRegularizations } from '../hooks/useRegularizations';
import { usePagination } from '../../../shared/hooks/usePagination';
import { RegularizationTable } from '../components/RegularizationTable';
import { Card } from '../../../shared/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { RegularizationStatus } from '../types/attendance.types';

export function RegularizationsPage() {
  const pagination = usePagination(20);
  const [status, setStatus] = useState<RegularizationStatus | 'ALL'>('PENDING');
  const { data, isLoading, isError, refetch } = useRegularizations({
    page: pagination.page,
    limit: pagination.limit,
    status: status === 'ALL' ? undefined : status,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Attendance Regularizations</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Review and approve attendance correction requests.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Requests</h3>
          <Select value={status} onValueChange={(v) => setStatus(v as RegularizationStatus | 'ALL')}>
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load regularization requests." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={ClipboardList} title="Nothing here" description="No regularization requests match this filter." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <RegularizationTable requests={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
