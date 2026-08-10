import { useMemo } from 'react';
import { useTimeLogs, useTimeSummary } from '../hooks/useTimeLogs';
import { useTasks } from '../../tasks/hooks/useTasks';
import { usePagination } from '../../../shared/hooks/usePagination';
import { TimerWidget } from '../components/TimerWidget';
import { ManualLogDialog } from '../components/ManualLogDialog';
import { TimeLogTable } from '../components/TimeLogTable';
import { Card } from '../../../shared/components/ui/card';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function TimeTrackingPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTimeLogs({ page: pagination.page, limit: pagination.limit });
  const { data: summary } = useTimeSummary({});
  const { data: taskPage } = useTasks({ page: 1, limit: 100 });

  const taskTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const task of taskPage?.data ?? []) map[task.id] = task.title;
    return map;
  }, [taskPage]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">Time tracking</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Run a timer or log time you already spent.</p>
        </div>
        <ManualLogDialog />
      </div>

      <TimerWidget />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Total logged</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{summary?.totalHours ?? 0}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Minutes</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{summary?.totalMinutes ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Entries</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{summary?.entryCount ?? 0}</p>
        </Card>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load your time logs." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && (
          <div className="space-y-4">
            <TimeLogTable logs={data.data} taskTitles={taskTitles} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
