import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useFinanceDocument, useSendFinanceDocument, useVoidFinanceDocument } from '../hooks/useFinance';
import { RecordPaymentDialog } from '../components/RecordPaymentDialog';
import { FinanceStatusBadge, TYPE_LABEL, formatMoney } from '../components/FinanceBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function FinanceDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading, isError, refetch } = useFinanceDocument(id);
  const sendMutation = useSendFinanceDocument();
  const voidMutation = useVoidFinanceDocument();

  async function send() {
    if (!id) return;
    try {
      await sendMutation.mutateAsync(id);
      toast.success('Document sent.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to send this document.');
    }
  }

  async function voidDoc() {
    if (!id) return;
    try {
      await voidMutation.mutateAsync(id);
      toast.success('Document voided.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to void this document.');
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !doc) return <ErrorState description="Failed to load this document." onRetry={() => refetch()} />;

  const remaining = Math.max(0, doc.totalAmount - doc.amountPaid);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/finance" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All documents
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{doc.number}</h1>
            <FinanceStatusBadge status={doc.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {TYPE_LABEL[doc.type]} · Issued {new Date(doc.issueDate).toLocaleDateString()}
            {doc.dueDate && ` · Due ${new Date(doc.dueDate).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex gap-2">
          {doc.status === 'DRAFT' && (
            <Button onClick={send} loading={sendMutation.isPending}>
              Send
            </Button>
          )}
          {(doc.status === 'SENT' || doc.status === 'OVERDUE') && (
            <>
              <Button variant="ghost" onClick={voidDoc} loading={voidMutation.isPending}>
                Void
              </Button>
              {id && remaining > 0 && <RecordPaymentDialog documentId={id} remaining={remaining} />}
            </>
          )}
          {doc.status === 'DRAFT' && (
            <Button variant="ghost" onClick={voidDoc} loading={voidMutation.isPending}>
              Void
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(doc.lineItems ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(item.unitPrice, doc.currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(item.amount, doc.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Subtotal</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatMoney(doc.subtotal, doc.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Tax ({doc.taxRate}%)</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatMoney(doc.taxAmount, doc.currency)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-1 font-bold">
            <span className="text-[var(--foreground)]">Total</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatMoney(doc.totalAmount, doc.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted-foreground)]">Paid</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatMoney(doc.amountPaid, doc.currency)}</span>
          </div>
          {remaining > 0 && (
            <div className="flex justify-between font-semibold">
              <span className="text-[var(--foreground)]">Remaining</span>
              <span className="tabular-nums text-[var(--foreground)]">{formatMoney(remaining, doc.currency)}</span>
            </div>
          )}
        </div>
      </Card>

      {(doc.payments ?? []).length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-bold text-[var(--foreground)]">Payments</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(doc.payments ?? []).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.paidAt).toLocaleDateString()}</TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>{payment.reference ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(payment.amount, doc.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
