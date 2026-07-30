import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { usePayrollRuns } from '../hooks/usePayroll';
import { usePagination } from '../../../shared/hooks/usePagination';
import { GenerateRunDialog } from '../components/GenerateRunDialog';
import { SalaryStructureDialog } from '../components/SalaryStructureDialog';
import { PayrollStatusBadge, MONTH_NAMES, formatCurrency } from '../components/PayrollStatusBadge';
import { Card } from '../../../shared/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function PayrollRunsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = usePayrollRuns({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Payroll</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Generate a monthly run, review the payslips, then approve and pay.
          </p>
        </div>
        <div className="flex gap-2">
          <SalaryStructureDialog />
          <GenerateRunDialog />
        </div>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load payroll runs." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState
            icon={Wallet}
            title="No payroll runs yet"
            description="Set salary structures, then generate your first monthly run."
          />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Payslips</TableHead>
                  <TableHead className="text-right">Total net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {MONTH_NAMES[run.month - 1]} {run.year}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{run.itemCount}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{formatCurrency(run.totalNet)}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/payroll/runs/${run.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
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
