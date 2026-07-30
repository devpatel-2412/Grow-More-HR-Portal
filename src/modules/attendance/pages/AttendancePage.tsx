import { CalendarDays } from 'lucide-react';
import { useAttendanceHistory } from '../hooks/useAttendanceHistory';
import { usePagination } from '../../../shared/hooks/usePagination';
import { PunchWidget } from '../components/PunchWidget';
import { AttendanceHistoryTable } from '../components/AttendanceHistoryTable';
import { RegularizationRequestDialog } from '../components/RegularizationRequestDialog';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function AttendancePage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useAttendanceHistory({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Attendance</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Punch in/out and review your attendance history.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Today</h3>
          <PunchWidget />
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--foreground)]">History</h3>
            <RegularizationRequestDialog />
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {isError && <ErrorState description="Failed to load attendance history." onRetry={() => refetch()} />}
          {!isLoading && !isError && data && data.data.length === 0 && (
            <EmptyState icon={CalendarDays} title="No attendance records yet" description="Punch in to start building your history." />
          )}
          {!isLoading && !isError && data && data.data.length > 0 && (
            <div className="space-y-4">
              <AttendanceHistoryTable records={data.data} />
              <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
