import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useClients } from '../hooks/useCrm';
import { usePagination } from '../../../shared/hooks/usePagination';
import { ClientDialog } from '../components/ClientDialog';
import { ClientStatusBadge } from '../components/CrmBadges';
import { Card } from '../../../shared/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ClientsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useClients({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Clients</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Accounts, contacts, and activity history.</p>
        </div>
        <ClientDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load clients." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Building2} title="No clients yet" description="Convert a lead or add a client directly." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact email</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>{client.contactEmail}</TableCell>
                    <TableCell>{client.industry ?? '—'}</TableCell>
                    <TableCell>
                      <ClientStatusBadge status={client.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/crm/clients/${client.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                        Open
                      </Link>
                    </TableCell>
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
