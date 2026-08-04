import { BookOpen } from 'lucide-react';
import { useSops } from '../hooks/useSop';
import { useAuth } from '../../auth/context/AuthContext';
import { SopTable } from '../components/SopTable';
import { SopFormDialog } from '../components/SopFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function SopsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useSops(pagination.queryParams);
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">SOP Library</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Standard operating procedures, versioned as they change.</p>
        </div>
        {canManage && <SopFormDialog />}
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by title or content..."
            aria-label="Search SOPs"
            className="max-w-xs"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load the SOP library." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={BookOpen} title="No SOPs yet" description="Create your first standard operating procedure." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <SopTable sops={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
