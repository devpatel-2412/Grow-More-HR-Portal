import { Building2 } from 'lucide-react';
import { useTenants } from '../hooks/useTenants';
import { CreateCompanyDialog } from '../components/CreateCompanyDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function CompaniesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTenants(pagination.queryParams);
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Companies"
      subtitle="Every company on the platform. Creating one provisions its workspace and invites its first administrator — there is no self-service sign-up."
      actions={<CreateCompanyDialog />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by name or domain..."
          aria-label="Search companies"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load companies.', onRetry: () => refetch() }}
      emptyProps={{ icon: Building2, title: 'No companies yet', description: 'Create your first company to get started.' }}
    >
      {data && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-semibold">{tenant.name}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">{tenant.domain}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
