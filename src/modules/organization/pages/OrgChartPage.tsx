import { useMemo } from 'react';
import { Network } from 'lucide-react';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { Card } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { EmployeeListItem } from '../../employees/types/employee.types';

interface OrgNode {
  employee: EmployeeListItem;
  reports: OrgNode[];
}

/** Builds a manager → direct-reports tree from the flat employee list; a manager outside this page (or none) makes a root. */
function buildTree(employees: EmployeeListItem[]): OrgNode[] {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const nodes = new Map<string, OrgNode>(employees.map((e) => [e.id, { employee: e, reports: [] }]));
  const roots: OrgNode[] = [];

  for (const employee of employees) {
    const node = nodes.get(employee.id)!;
    const managerId = employee.managerId;
    if (managerId && byId.has(managerId)) {
      nodes.get(managerId)!.reports.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function OrgChartNode({ node }: { node: OrgNode }) {
  const { employee, reports } = node;
  return (
    <li>
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold text-[var(--foreground)]">
          {employee.firstName[0]}
          {employee.lastName[0]}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--foreground)]">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="truncate text-xs text-[var(--muted-foreground)]">
            {employee.designation} · {employee.department}
          </div>
        </div>
      </div>
      {reports.length > 0 && (
        <ul className="ml-6 mt-2 space-y-2 border-l border-[var(--border)] pl-4">
          {reports.map((child) => (
            <OrgChartNode key={child.employee.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChartPage() {
  const { data, isLoading, isError, refetch } = useEmployees({ page: 1, limit: 500 });
  const roots = useMemo(() => buildTree(data?.data ?? []), [data]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Org chart</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Reporting structure, built from each employee's manager.</p>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load the org chart." onRetry={() => refetch()} />}

        {!isLoading && !isError && roots.length === 0 && (
          <EmptyState icon={Network} title="No employees yet" description="Add employees and assign managers to see the org chart." />
        )}

        {!isLoading && !isError && roots.length > 0 && (
          <ul className="space-y-2">
            {roots.map((root) => (
              <OrgChartNode key={root.employee.id} node={root} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
