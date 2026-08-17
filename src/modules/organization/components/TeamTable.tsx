import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { TeamFormDialog } from './TeamFormDialog';
import { Button } from '../../../shared/components/ui/button';
import { useDeleteTeam } from '../hooks/useOrganization';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import type { TeamRecord, BranchRecord } from '../types/organization.types';
import type { EmployeeListItem } from '../../employees/types/employee.types';

export function TeamTable({
  teams,
  branches,
  employees,
  sort,
  onSortChange,
}: {
  teams: TeamRecord[];
  branches: BranchRecord[];
  employees: EmployeeListItem[];
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
}) {
  const deleteMutation = useDeleteTeam();
  const canManage = useHasPermission('org:manage');
  const branchNames: Record<string, string> = {};
  for (const branch of branches) branchNames[branch.id] = branch.name;
  const employeeNames: Record<string, string> = {};
  for (const employee of employees) employeeNames[employee.id] = `${employee.firstName} ${employee.lastName}`;

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Team deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this team.');
    }
  }

  const columns: DataTableColumn<TeamRecord>[] = [
    {
      id: 'name',
      header: 'Team',
      sortable: true,
      alwaysVisible: true,
      csvValue: (t) => t.name,
      cell: (t) => (
        <>
          <div className="font-semibold">{t.name}</div>
          {t.description && <div className="text-[var(--muted-foreground)]">{t.description}</div>}
        </>
      ),
    },
    {
      id: 'branch',
      header: 'Branch',
      csvValue: (t) => (t.branchId ? (branchNames[t.branchId] ?? '') : ''),
      cell: (t) => (t.branchId ? (branchNames[t.branchId] ?? '—') : '—'),
    },
    {
      id: 'lead',
      header: 'Lead',
      csvValue: (t) => (t.leadId ? (employeeNames[t.leadId] ?? '') : ''),
      cell: (t) => (t.leadId ? (employeeNames[t.leadId] ?? '—') : '—'),
    },
    // Omitted entirely (not just emptied) when the user can't manage teams — no dangling Actions column.
    ...(canManage
      ? [
          {
            id: 'actions',
            header: 'Actions',
            className: 'text-right',
            cell: (t) => (
              <div className="flex justify-end gap-2">
                <TeamFormDialog mode="edit" team={t} />
                <Button size="icon" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<TeamRecord>,
        ]
      : []),
  ];

  return (
    <DataTable
      tableId="teams"
      columns={columns}
      rows={teams}
      getRowId={(t) => t.id}
      sort={sort}
      onSortChange={onSortChange}
      exportFilename="teams"
    />
  );
}
