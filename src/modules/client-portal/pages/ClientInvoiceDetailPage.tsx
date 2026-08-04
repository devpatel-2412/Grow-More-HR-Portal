import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useOwnFinanceDocument } from '../hooks/useClientPortal';
import { FinanceStatusBadge, formatMoney, TYPE_LABEL } from '../../finance/components/FinanceBadges';
import { Card } from '../../../shared/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ClientInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading, isError, refetch } = useOwnFinanceDocument(id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !doc) return <ErrorState description="Failed to load this document." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/portal/invoices" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All invoices &amp; quotes
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{doc.number}</h1>
        <FinanceStatusBadge status={doc.status} />
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        {TYPE_LABEL[doc.type]} · Issued {new Date(doc.issueDate).toLocaleDateString()}
        {doc.dueDate && ` · Due ${new Date(doc.dueDate).toLocaleDateString()}`}
      </p>

      <Card className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(doc.lineItems ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatMoney(item.unitPrice, doc.currency)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.amount, doc.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Subtotal</span>
            <span className="text-[var(--foreground)]">{formatMoney(doc.subtotal, doc.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Tax ({doc.taxRate}%)</span>
            <span className="text-[var(--foreground)]">{formatMoney(doc.taxAmount, doc.currency)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-[var(--foreground)]">Total</span>
            <span className="text-[var(--foreground)]">{formatMoney(doc.totalAmount, doc.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Paid</span>
            <span className="text-[var(--foreground)]">{formatMoney(doc.amountPaid, doc.currency)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
