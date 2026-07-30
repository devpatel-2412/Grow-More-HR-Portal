import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { useFinanceDocuments } from '../hooks/useFinance';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateFinanceDocumentDialog } from '../components/CreateFinanceDocumentDialog';
import { FinanceStatusBadge, TYPE_LABEL, formatMoney } from '../components/FinanceBadges';
import { Card } from '../../../shared/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function FinanceDocumentsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useFinanceDocuments({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Finance</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Quotations, invoices, expenses, and bills.</p>
        </div>
        <CreateFinanceDocumentDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load finance documents." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Receipt} title="No documents yet" description="Create your first quotation or invoice." />
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
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="whitespace-nowrap font-medium">{doc.number}</TableCell>
                    <TableCell>{TYPE_LABEL[doc.type]}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(doc.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(doc.totalAmount, doc.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(doc.amountPaid, doc.currency)}</TableCell>
                    <TableCell>
                      <FinanceStatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/finance/${doc.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
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
