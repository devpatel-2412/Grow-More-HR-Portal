import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { usePayrollRuns } from '../hooks/usePayroll';
import { usePagination } from '../../../shared/hooks/usePagination';
import { GenerateRunDialog } from '../components/GenerateRunDialog';
import { SalaryStructureDialog } from '../components/SalaryStructureDialog';
import { PayrollStatusBadge, MONTH_NAMES, formatCurrency } from '../components/PayrollStatusBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function PayrollRunsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = usePayrollRuns({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Payroll"
      subtitle="Generate a monthly run, review the payslips, then approve and pay."
      actions={
        <>
          <SalaryStructureDialog />
          <GenerateRunDialog />
        </>
      }
      state={state}
      errorProps={{ description: 'Failed to load payroll runs.', onRetry: () => refetch() }}
      emptyProps={{ icon: Wallet, title: 'No payroll runs yet', description: 'Set salary structures, then generate your first monthly run.' }}
    >
      {data && (
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
    </ListPage>
  );
}
