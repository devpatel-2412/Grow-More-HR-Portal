import { Contact } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function EmployeesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useEmployees(pagination.queryParams);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Employees</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your organization's employee directory.</p>
        </div>
        <EmployeeFormDialog mode="create" existingEmployeeUserIds={(data?.data ?? []).map((e) => e.userId)} />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by name or employee ID..."
            aria-label="Search employees"
            className="max-w-xs"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load employees." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Contact} title="No employees yet" description="Add your first employee profile to get started." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <EmployeeTable employees={data.data} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
