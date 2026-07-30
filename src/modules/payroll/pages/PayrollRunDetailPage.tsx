import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { usePayrollRun, usePayrollRunTransition } from '../hooks/usePayroll';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { PayslipTable } from '../components/PayslipTable';
import { PayrollStatusBadge, MONTH_NAMES, formatCurrency } from '../components/PayrollStatusBadge';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading, isError, refetch } = usePayrollRun(id);
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const transition = usePayrollRunTransition();

  const employeeNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const employee of employeePage?.data ?? []) {
      map[employee.id] = `${employee.firstName} ${employee.lastName}`;
    }
    return map;
  }, [employeePage]);

  async function act(action: 'approve' | 'mark-paid' | 'cancel') {
    if (!id) return;
    try {
      await transition.mutateAsync({ id, action });
      toast.success(action === 'approve' ? 'Run approved.' : action === 'mark-paid' ? 'Run marked as paid.' : 'Run cancelled.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update this run.');
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !run) return <ErrorState description="Failed to load this payroll run." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All runs
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {MONTH_NAMES[run.month - 1]} {run.year}
            </h1>
            <PayrollStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {run.itemCount} payslips · total net {formatCurrency(run.totalNet)}
          </p>
        </div>

        <div className="flex gap-2">
          {run.status === 'DRAFT' && (
            <>
              <Button variant="ghost" onClick={() => act('cancel')} loading={transition.isPending}>
                Cancel run
              </Button>
              <Button onClick={() => act('approve')} loading={transition.isPending}>
                Approve
              </Button>
            </>
          )}
          {run.status === 'APPROVED' && (
            <>
              <Button variant="ghost" onClick={() => act('cancel')} loading={transition.isPending}>
                Cancel run
              </Button>
              <Button onClick={() => act('mark-paid')} loading={transition.isPending}>
                Mark as paid
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <PayslipTable items={run.items ?? []} employeeNames={employeeNames} showEmployee />
      </Card>
    </div>
  );
}
