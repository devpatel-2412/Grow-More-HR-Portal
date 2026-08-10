import { Boxes } from 'lucide-react';
import { useInventoryItems, useVendors } from '../hooks/useInventory';
import { InventoryTable } from '../components/InventoryTable';
import { InventoryItemFormDialog } from '../components/InventoryItemFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function InventoryItemsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useInventoryItems(pagination.queryParams);
  const { data: vendorPage } = useVendors({ page: 1, limit: 100 });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Inventory"
      subtitle="Stock levels for consumables and supplies."
      maxWidth="6xl"
      actions={<InventoryItemFormDialog mode="create" />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          aria-label="Search inventory"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load inventory.', onRetry: () => refetch() }}
      emptyProps={{ icon: Boxes, title: 'No inventory items yet', description: 'Add your first item to start tracking stock.' }}
    >
      {data && (
        <div className="space-y-4">
          <InventoryTable items={data.data} vendors={vendorPage?.data ?? []} sort={pagination.sort} onSortChange={pagination.setSort} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
