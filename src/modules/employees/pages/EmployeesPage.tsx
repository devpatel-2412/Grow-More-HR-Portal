import { Contact } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function EmployeesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useEmployees(pagination.queryParams);
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Employees"
      subtitle="Your organization's employee directory."
      actions={<EmployeeFormDialog mode="create" existingEmployeeUserIds={(data?.data ?? []).map((e) => e.userId)} />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by name or employee ID..."
          aria-label="Search employees"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load employees.', onRetry: () => refetch() }}
      emptyProps={{ icon: Contact, title: 'No employees yet', description: 'Add your first employee profile to get started.' }}
    >
      {data && (
        <div className="space-y-4">
          <EmployeeTable employees={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
