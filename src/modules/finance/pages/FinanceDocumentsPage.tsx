import { Link } from 'react-router-dom';
import { Receipt, TrendingUp } from 'lucide-react';
import { useFinanceDocuments } from '../hooks/useFinance';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateFinanceDocumentDialog } from '../components/CreateFinanceDocumentDialog';
import { FinanceStatusBadge, TYPE_LABEL, formatMoney } from '../components/FinanceBadges';
import { Button } from '../../../shared/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function FinanceDocumentsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useFinanceDocuments({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Finance"
      subtitle="Quotations, invoices, expenses, and bills."
      maxWidth="6xl"
      actions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link to="/finance/reports/profit-loss">
              <TrendingUp className="h-4 w-4" />
              Profit &amp; Loss
            </Link>
          </Button>
          <CreateFinanceDocumentDialog />
        </>
      }
      state={state}
      errorProps={{ description: 'Failed to load finance documents.', onRetry: () => refetch() }}
      emptyProps={{ icon: Receipt, title: 'No documents yet', description: 'Create your first quotation or invoice.' }}
    >
      {data && (
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
                  <TableCell className="whitespace-nowrap">{doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '—'}</TableCell>
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
    </ListPage>
  );
}
