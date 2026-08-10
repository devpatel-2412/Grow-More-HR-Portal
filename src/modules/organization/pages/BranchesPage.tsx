import { Building2 } from 'lucide-react';
import { useBranches } from '../hooks/useOrganization';
import { BranchTable } from '../components/BranchTable';
import { BranchFormDialog } from '../components/BranchFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function BranchesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useBranches(pagination.queryParams);
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Branches"
      subtitle="Offices and sites employees and teams belong to."
      actions={<BranchFormDialog mode="create" />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by name, code, or city..."
          aria-label="Search branches"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load branches.', onRetry: () => refetch() }}
      emptyProps={{ icon: Building2, title: 'No branches yet', description: 'Add your first office or site.' }}
    >
      {data && (
        <div className="space-y-4">
          <BranchTable branches={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
