import { Users2 } from 'lucide-react';
import { useTeams, useBranches } from '../hooks/useOrganization';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { TeamTable } from '../components/TeamTable';
import { TeamFormDialog } from '../components/TeamFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function TeamsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTeams(pagination.queryParams);
  const { data: branchPage } = useBranches({ page: 1, limit: 100 });
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Teams"
      subtitle="Groups of employees under a lead."
      actions={<TeamFormDialog mode="create" />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by team name..."
          aria-label="Search teams"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load teams.', onRetry: () => refetch() }}
      emptyProps={{ icon: Users2, title: 'No teams yet', description: 'Create your first team.' }}
    >
      {data && (
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
    </ListPage>
  );
}
