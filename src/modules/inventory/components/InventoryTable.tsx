import { toast } from 'sonner';
import { Trash2, TriangleAlert } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { InventoryItemFormDialog } from './InventoryItemFormDialog';
import { StockInDialog, StockOutDialog, AdjustStockDialog } from './StockMovementDialogs';
import { TransactionHistoryDialog } from './TransactionHistoryDialog';
import { Button } from '../../../shared/components/ui/button';
import { useDeleteInventoryItem } from '../hooks/useInventory';
import { ApiError } from '../../../shared/lib/api-client';
import type { InventoryItemRecord, VendorRecord } from '../types/inventory.types';

export function InventoryTable({
  items,
  vendors,
  sort,
  onSortChange,
}: {
  items: InventoryItemRecord[];
  vendors: VendorRecord[];
  sort?: string;
  onSortChange?: (sort: string | undefined) => void;
}) {
  const deleteMutation = useDeleteInventoryItem();
  const vendorNames: Record<string, string> = {};
  for (const vendor of vendors) vendorNames[vendor.id] = vendor.name;

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Inventory item deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this item.');
    }
  }

  const columns: DataTableColumn<InventoryItemRecord>[] = [
    {
      id: 'name',
      header: 'Item',
      sortable: true,
      alwaysVisible: true,
      csvValue: (i) => i.name,
      cell: (i) => (
        <>
          <div className="font-semibold">{i.name}</div>
          <div className="text-[var(--muted-foreground)]">{i.sku}</div>
        </>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      csvValue: (i) => i.category ?? '',
      cell: (i) => i.category ?? '—',
    },
    {
      id: 'quantityOnHand',
      header: 'On hand',
      sortable: true,
      csvValue: (i) => `${i.quantityOnHand} ${i.unit}`,
      cell: (i) => (
        <div className="flex items-center gap-1.5">
          <span className={i.quantityOnHand <= i.reorderLevel ? 'font-semibold text-amber-500' : ''}>
            {i.quantityOnHand} {i.unit}
          </span>
          {i.quantityOnHand <= i.reorderLevel && <TriangleAlert className="h-3.5 w-3.5 text-amber-500" aria-label="Low stock" />}
        </div>
      ),
    },
    {
      id: 'vendor',
      header: 'Vendor',
      csvValue: (i) => (i.vendorId ? (vendorNames[i.vendorId] ?? '') : ''),
      cell: (i) => (i.vendorId ? (vendorNames[i.vendorId] ?? '—') : '—'),
    },
    {
      id: 'unitCost',
      header: 'Unit cost',
      csvValue: (i) => i.unitCost.toFixed(2),
      cell: (i) => i.unitCost.toFixed(2),
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (i) => (
        <div className="flex justify-end gap-1.5">
          <StockInDialog item={i} />
          <StockOutDialog item={i} />
          <AdjustStockDialog item={i} />
          <TransactionHistoryDialog item={i} />
          <InventoryItemFormDialog mode="edit" item={i} />
          <Button size="icon" variant="ghost" aria-label={`Delete ${i.name}`} onClick={() => remove(i.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      tableId="inventory-items"
      columns={columns}
      rows={items}
      getRowId={(i) => i.id}
      sort={sort}
      onSortChange={onSortChange}
      exportFilename="inventory"
    />
  );
}
