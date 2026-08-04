import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { useOwnFinanceDocuments } from '../hooks/useClientPortal';
import { FinanceStatusBadge, formatMoney, TYPE_LABEL } from '../../finance/components/FinanceBadges';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ClientInvoicesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useOwnFinanceDocuments({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Invoices &amp; Quotes</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Every document issued to your account.</p>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load your documents." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Receipt} title="Nothing here yet" description="Invoices and quotes will appear here once issued." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <Link to={`/portal/invoices/${doc.id}`} className="hover:underline">
                        {doc.number}
                      </Link>
                    </TableCell>
                    <TableCell>{TYPE_LABEL[doc.type]}</TableCell>
                    <TableCell>{new Date(doc.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{formatMoney(doc.totalAmount, doc.currency)}</TableCell>
                    <TableCell>
                      <FinanceStatusBadge status={doc.status} />
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
