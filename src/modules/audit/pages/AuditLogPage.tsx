import { ScrollText } from 'lucide-react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLogTable } from '../components/AuditLogTable';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function AuditLogPage() {
  const pagination = usePagination(25);
  const { data, isLoading, isError, refetch } = useAuditLogs({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Security-relevant activity for your workspace. Actor IDs are shown, not names — see
          Team for the full directory.
        </p>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load the audit log." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={ScrollText} title="No activity yet" description="Security-relevant actions will appear here." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <AuditLogTable entries={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
