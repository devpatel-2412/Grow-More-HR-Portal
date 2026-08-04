import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { VendorFormDialog } from './VendorFormDialog';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { useDeleteVendor } from '../hooks/useInventory';
import { ApiError } from '../../../shared/lib/api-client';
import type { VendorRecord } from '../types/inventory.types';

export function VendorTable({
  vendors,
  sort,
  onSortChange,
}: {
  vendors: VendorRecord[];
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
}) {
  const deleteMutation = useDeleteVendor();

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Vendor deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this vendor.');
    }
  }

  const columns: DataTableColumn<VendorRecord>[] = [
    {
      id: 'name',
      header: 'Vendor',
      sortable: true,
      alwaysVisible: true,
      csvValue: (v) => v.name,
      cell: (v) => (
        <>
          <div className="font-semibold">{v.name}</div>
          {v.contactName && <div className="text-[var(--muted-foreground)]">{v.contactName}</div>}
        </>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      csvValue: (v) => [v.email, v.phone].filter(Boolean).join(' · '),
      cell: (v) => [v.email, v.phone].filter(Boolean).join(' · ') || '—',
    },
    {
      id: 'gstNumber',
      header: 'GST',
      csvValue: (v) => v.gstNumber ?? '',
      cell: (v) => v.gstNumber ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      csvValue: (v) => v.status,
      cell: (v) => <Badge variant={v.status === 'ACTIVE' ? 'success' : 'neutral'}>{v.status}</Badge>,
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (v) => (
        <div className="flex justify-end gap-2">
          <VendorFormDialog mode="edit" vendor={v} />
          <Button size="icon" variant="ghost" aria-label={`Delete ${v.name}`} onClick={() => remove(v.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      tableId="vendors"
      columns={columns}
      rows={vendors}
      getRowId={(v) => v.id}
      sort={sort}
      onSortChange={onSortChange}
      exportFilename="vendors"
    />
  );
}
