import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { UserX } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { Avatar } from '../../../shared/components/ui/avatar';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { useUpdateEmployee } from '../hooks/useUpdateEmployee';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import type { EmployeeListItem } from '../types/employee.types';

export function EmployeeTable({
  employees,
  sort,
  onSortChange,
}: {
  employees: EmployeeListItem[];
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
}) {
  const updateMutation = useUpdateEmployee();
  const canUpdate = useHasPermission('employee:update');

  const columns: DataTableColumn<EmployeeListItem>[] = useMemo(
    () => [
      {
        id: 'firstName',
        header: 'Employee',
        sortable: true,
        alwaysVisible: true,
        csvValue: (e) => `${e.firstName} ${e.lastName}`,
        cell: (e) => (
          <Link to={`/employees/${e.id}`} className="flex items-center gap-3 hover:underline">
            <Avatar name={`${e.firstName} ${e.lastName}`} imageUrl={e.avatarUrl} size="sm" />
            <div>
              <div className="font-semibold">
                {e.firstName} {e.lastName}
              </div>
              <div className="text-[var(--muted-foreground)]">{e.employeeId}</div>
            </div>
          </Link>
        ),
      },
      {
        id: 'department',
        header: 'Department',
        sortable: true,
        csvValue: (e) => e.department,
        cell: (e) => e.department,
      },
      {
        id: 'designation',
        header: 'Designation',
        csvValue: (e) => e.designation,
        cell: (e) => e.designation,
      },
      {
        id: 'dateOfJoining',
        header: 'Joined',
        sortable: true,
        csvValue: (e) => new Date(e.dateOfJoining).toISOString().slice(0, 10),
        cell: (e) => <span className="text-[var(--muted-foreground)]">{new Date(e.dateOfJoining).toLocaleDateString()}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        csvValue: (e) => e.status,
        cell: (e) => <EmployeeStatusBadge status={e.status} />,
      },
      // Omitted entirely (not just emptied) when the user can't edit — no dangling Actions column.
      ...(canUpdate
        ? [
            {
              id: 'actions',
              header: 'Actions',
              className: 'text-right',
              cell: (e) => <EmployeeFormDialog mode="edit" employee={e} />,
            } satisfies DataTableColumn<EmployeeListItem>,
          ]
        : []),
    ],
    [canUpdate],
  );

  async function markOffboarding(rows: EmployeeListItem[]) {
    try {
      await Promise.all(
        rows.map((row) =>
          updateMutation.mutateAsync({
            id: row.id,
            values: {
              phone: row.phone ?? undefined,
              department: row.department,
              designation: row.designation,
              status: 'OFFBOARDING',
            },
          }),
        ),
      );
      toast.success(`${rows.length} employee${rows.length === 1 ? '' : 's'} marked as offboarding.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update the selected employees.');
    }
  }

  return (
    <DataTable
      tableId="employees"
      columns={columns}
      rows={employees}
      getRowId={(e) => e.id}
      sort={sort}
      onSortChange={onSortChange}
      selectable={canUpdate}
      bulkActions={canUpdate ? [{ label: 'Mark offboarding', icon: UserX, onAction: markOffboarding }] : []}
      exportFilename="employees"
      mobileCard={(e) => (
        <div className="flex items-center justify-between gap-3">
          <Link to={`/employees/${e.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
            <Avatar name={`${e.firstName} ${e.lastName}`} imageUrl={e.avatarUrl} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--foreground)]">
                {e.firstName} {e.lastName}
              </div>
              <div className="truncate text-xs text-[var(--muted-foreground)]">
                {e.employeeId} · {e.designation} · {e.department}
              </div>
              <div className="mt-1">
                <EmployeeStatusBadge status={e.status} />
              </div>
            </div>
          </Link>
          <EmployeeFormDialog mode="edit" employee={e} />
        </div>
      )}
    />
  );
}
