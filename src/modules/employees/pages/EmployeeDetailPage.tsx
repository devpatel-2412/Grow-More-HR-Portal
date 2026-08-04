import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEmployee } from '../hooks/useEmployee';
import { useAuth } from '../../auth/context/AuthContext';
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge';
import { ChecklistPanel } from '../../lifecycle/components/ChecklistPanel';
import { LifecycleEventsPanel } from '../../lifecycle/components/LifecycleEventsPanel';
import { FnfSettlementPanel } from '../../lifecycle/components/FnfSettlementPanel';
import { Card } from '../../../shared/components/ui/card';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { cn } from '../../../shared/utils/cn';

const TABS = ['overview', 'checklist', 'lifecycle', 'fnf'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { overview: 'Overview', checklist: 'Checklist', lifecycle: 'Lifecycle', fnf: 'F&F settlement' };

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: employee, isLoading, isError, refetch } = useEmployee(id);
  const canManage = !!user && ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(user.role);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !employee || !id) {
    return <ErrorState description="Failed to load this employee." onRetry={() => refetch()} />;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const exitEligible = employee.status === 'OFFBOARDING' || employee.status === 'TERMINATED' || employee.status === 'RESIGNED';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to="/employees"
          className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Employees
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{fullName}</h1>
          <EmployeeStatusBadge status={employee.status} />
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {employee.employeeId} · {employee.designation} · {employee.department}
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-xs font-semibold transition-colors',
              tab === t
                ? 'border-b-2 border-[var(--primary)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <Card className="p-0">
        {tab === 'overview' && (
          <dl className="grid grid-cols-2 gap-4 p-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Phone</dt>
              <dd className="text-[var(--foreground)]">{employee.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Date of joining</dt>
              <dd className="text-[var(--foreground)]">{new Date(employee.dateOfJoining).toLocaleDateString()}</dd>
            </div>
          </dl>
        )}
        {tab === 'checklist' && <ChecklistPanel employeeId={id} canManage={canManage} />}
        {tab === 'lifecycle' && (
          <LifecycleEventsPanel employeeId={id} employeeName={fullName} status={employee.status} canManage={canManage} />
        )}
        {tab === 'fnf' && <FnfSettlementPanel employeeId={id} employeeName={fullName} eligible={exitEligible} canManage={canManage} />}
      </Card>
    </div>
  );
}
