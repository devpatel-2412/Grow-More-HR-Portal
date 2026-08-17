import { Link } from 'react-router-dom';
import { Users, UserCheck, Clock, CalendarOff, FolderKanban, ListChecks, Wallet, TrendingUp, Cake, PartyPopper, ScrollText } from 'lucide-react';
import { useAdminSummary } from '../hooks/useDashboard';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { StatCard } from '../../../shared/components/ui/stat-card';
import { Card } from '../../../shared/components/ui/card';
import { DonutChart } from '../../../shared/components/charts/DonutChart';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function daysAwayLabel(daysAway: number): string {
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  return `In ${daysAway} days`;
}

export function AdminKpiDashboard() {
  const { data: summary, isLoading, isError, refetch } = useAdminSummary();
  const canReadFinance = useHasPermission('finance:read');
  const canReadPayroll = useHasPermission('payroll:read:tenant');
  const canReadAudit = useHasPermission('audit:read');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="Failed to load organization KPIs." onRetry={() => refetch()} />;
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Employees" value={summary.headcount.total} icon={Users} sublabel={`${summary.headcount.active} active`} />
        <StatCard label="Present today" value={summary.attendanceToday.present} icon={UserCheck} tone="success" />
        <StatCard
          label="Late today"
          value={summary.attendanceToday.late}
          icon={Clock}
          tone={summary.attendanceToday.late > 0 ? 'danger' : 'default'}
        />
        <StatCard label="On leave today" value={summary.attendanceToday.onLeave} icon={CalendarOff} />
        <StatCard label="Active projects" value={summary.projects.active} icon={FolderKanban} sublabel={`${summary.projects.completed} completed`} />
        <StatCard label="Pending tasks" value={summary.pendingTaskCount} icon={ListChecks} />
        {canReadFinance && <StatCard label="Revenue this month" value={formatMoney(summary.revenueThisMonth)} icon={TrendingUp} />}
        {canReadPayroll && (
          <StatCard
            label="Latest payroll"
            value={summary.payroll ? formatMoney(summary.payroll.totalNet) : '—'}
            icon={Wallet}
            sublabel={summary.payroll ? `${summary.payroll.month}/${summary.payroll.year} · ${summary.payroll.status}` : 'No payroll run yet'}
          />
        )}
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Today's attendance</h3>
        <DonutChart
          segments={[
            { label: 'Present', value: summary.attendanceToday.present, colorVar: '--primary' },
            { label: 'Half day', value: summary.attendanceToday.halfDay, colorVar: '--secondary' },
            { label: 'Late', value: summary.attendanceToday.late, colorVar: '--warning' },
            { label: 'On leave', value: summary.attendanceToday.onLeave, colorVar: '--muted-foreground' },
            { label: 'Absent', value: summary.attendanceToday.absent, colorVar: '--destructive' },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <Cake className="h-4 w-4" />
            Upcoming birthdays
          </h3>
          {summary.birthdays.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">None in the next 7 days.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {summary.birthdays.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span className="text-[var(--foreground)]">
                    {b.firstName} {b.lastName}
                  </span>
                  <span className="text-[var(--muted-foreground)]">{daysAwayLabel(b.daysAway)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <PartyPopper className="h-4 w-4" />
            Work anniversaries
          </h3>
          {summary.anniversaries.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">None in the next 7 days.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {summary.anniversaries.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-[var(--foreground)]">
                    {a.firstName} {a.lastName}
                  </span>
                  <span className="text-[var(--muted-foreground)]">{daysAwayLabel(a.daysAway)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <ScrollText className="h-4 w-4" />
            Recent activity
          </h3>
          {summary.recentActivity.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">Nothing recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {summary.recentActivity.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[var(--foreground)]">{entry.action.replace(/_/g, ' ')}</span>
                  <span className="shrink-0 text-[var(--muted-foreground)]">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
          {canReadAudit && (
            <Link to="/audit-log" className="block text-xs text-[var(--primary)] hover:underline">
              View full audit log &rarr;
            </Link>
          )}
        </Card>
      </div>

      {summary.newEmployees.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">New employees (last 30 days)</h3>
          <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
            {summary.newEmployees.map((e) => (
              <li key={e.id} className="rounded-lg border border-[var(--border)] p-2">
                <p className="font-semibold text-[var(--foreground)]">
                  {e.firstName} {e.lastName}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  {e.designation} &middot; {e.department}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
