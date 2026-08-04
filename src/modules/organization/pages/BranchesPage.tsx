import { Building2 } from 'lucide-react';
import { useBranches } from '../hooks/useOrganization';
import { BranchTable } from '../components/BranchTable';
import { BranchFormDialog } from '../components/BranchFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function BranchesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useBranches(pagination.queryParams);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Branches</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Offices and sites employees and teams belong to.</p>
        </div>
        <BranchFormDialog mode="create" />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by name, code, or city..."
            aria-label="Search branches"
            className="max-w-xs"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load branches." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Building2} title="No branches yet" description="Add your first office or site." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <BranchTable branches={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
