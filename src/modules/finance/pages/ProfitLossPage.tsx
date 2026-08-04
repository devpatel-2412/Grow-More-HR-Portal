import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useProfitAndLoss } from '../hooks/useFinance';
import { formatMoney } from '../components/FinanceBadges';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { cn } from '../../../shared/utils/cn';

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProfitLossPage() {
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());
  const { data: report, isLoading, isError, refetch } = useProfitAndLoss({ from, to });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link to="/finance" className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          All documents
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Profit &amp; Loss</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Accrual basis — revenue is recognized when an invoice is issued, not when it's paid.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="pl-from">From</Label>
            <Input id="pl-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pl-to">To</Label>
            <Input id="pl-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {isError && <ErrorState description="Failed to load the report." onRetry={() => refetch()} />}

      {!isLoading && !isError && report && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Revenue</p>
              <p className="text-2xl font-extrabold tabular-nums text-[var(--foreground)]">{formatMoney(report.revenue)}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Expenses</p>
              <p className="text-2xl font-extrabold tabular-nums text-[var(--foreground)]">{formatMoney(report.expenses)}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Net profit</p>
              <p
                className={cn(
                  'text-2xl font-extrabold tabular-nums',
                  report.netProfit >= 0 ? 'text-emerald-500' : 'text-[var(--destructive)]',
                )}
              >
                {formatMoney(report.netProfit)}
              </p>
            </Card>
          </div>

          <Card>
            {report.byMonth.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No activity in this range"
                description="Issued invoices, expenses, and bills within the date range will show up here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byMonth.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.expenses)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-semibold',
                          row.netProfit >= 0 ? 'text-emerald-500' : 'text-[var(--destructive)]',
                        )}
                      >
                        {formatMoney(row.netProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
