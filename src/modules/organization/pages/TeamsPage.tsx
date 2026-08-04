import { Users2 } from 'lucide-react';
import { useTeams, useBranches } from '../hooks/useOrganization';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { TeamTable } from '../components/TeamTable';
import { TeamFormDialog } from '../components/TeamFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function TeamsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTeams(pagination.queryParams);
  const { data: branchPage } = useBranches({ page: 1, limit: 100 });
  const { data: employeePage } = useEmployees({ page: 1, limit: 200 });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Teams</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Groups of employees under a lead.</p>
        </div>
        <TeamFormDialog mode="create" />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by team name..."
            aria-label="Search teams"
            className="max-w-xs"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load teams." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Users2} title="No teams yet" description="Create your first team." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <TeamTable
              teams={data.data}
              branches={branchPage?.data ?? []}
              employees={employeePage?.data ?? []}
              sort={pagination.sort}
              onSortChange={pagination.setSort}
            />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
