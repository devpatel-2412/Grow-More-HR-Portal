import { Receipt } from 'lucide-react';
import { usePayslips } from '../hooks/usePayroll';
import { usePagination } from '../../../shared/hooks/usePagination';
import { PayslipTable } from '../components/PayslipTable';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function MyPayslipsPage() {
  const pagination = usePagination(12);
  const { data, isLoading, isError, refetch } = usePayslips({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">My payslips</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your monthly pay breakdown and deductions.</p>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load your payslips." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState
            icon={Receipt}
            title="No payslips yet"
            description="Payslips appear here once HR generates a payroll run."
          />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <PayslipTable items={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
