import { Building2 } from 'lucide-react';
import { useTenants } from '../hooks/useTenants';
import { CreateCompanyDialog } from '../components/CreateCompanyDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function CompaniesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTenants(pagination.queryParams);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Companies</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Every company on the platform. Creating one provisions its workspace and invites its first administrator —
            there is no self-service sign-up.
          </p>
        </div>
        <CreateCompanyDialog />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by name or domain..."
            aria-label="Search companies"
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

        {isError && <ErrorState description="Failed to load companies." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Building2} title="No companies yet" description="Create your first company to get started." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
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
      </Card>
    </div>
  );
}
