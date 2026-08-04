import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { BranchFormDialog } from './BranchFormDialog';
import { Button } from '../../../shared/components/ui/button';
import { useDeleteBranch } from '../hooks/useOrganization';
import { ApiError } from '../../../shared/lib/api-client';
import type { BranchRecord } from '../types/organization.types';

export function BranchTable({
  branches,
  sort,
  onSortChange,
}: {
  branches: BranchRecord[];
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
}) {
  const deleteMutation = useDeleteBranch();

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Branch deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this branch.');
    }
  }

  const columns: DataTableColumn<BranchRecord>[] = [
    {
      id: 'name',
      header: 'Branch',
      sortable: true,
      alwaysVisible: true,
      csvValue: (b) => b.name,
      cell: (b) => (
        <>
          <div className="font-semibold">{b.name}</div>
          <div className="text-[var(--muted-foreground)]">{b.code}</div>
        </>
      ),
    },
    {
      id: 'city',
      header: 'Location',
      sortable: true,
      csvValue: (b) => [b.city, b.state, b.country].filter(Boolean).join(', '),
      cell: (b) => [b.city, b.state, b.country].filter(Boolean).join(', ') || '—',
    },
    {
      id: 'isHeadOffice',
      header: 'Head office',
      csvValue: (b) => (b.isHeadOffice ? 'Yes' : 'No'),
      cell: (b) => (b.isHeadOffice ? 'Yes' : '—'),
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (b) => (
        <div className="flex justify-end gap-2">
          <BranchFormDialog mode="edit" branch={b} />
          <Button size="icon" variant="ghost" aria-label={`Delete ${b.name}`} onClick={() => remove(b.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      tableId="branches"
      columns={columns}
      rows={branches}
      getRowId={(b) => b.id}
      sort={sort}
      onSortChange={onSortChange}
      exportFilename="branches"
    />
  );
}
