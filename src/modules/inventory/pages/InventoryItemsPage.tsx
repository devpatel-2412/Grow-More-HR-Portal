import { Boxes } from 'lucide-react';
import { useInventoryItems, useVendors } from '../hooks/useInventory';
import { InventoryTable } from '../components/InventoryTable';
import { InventoryItemFormDialog } from '../components/InventoryItemFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function InventoryItemsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useInventoryItems(pagination.queryParams);
  const { data: vendorPage } = useVendors({ page: 1, limit: 100 });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Inventory</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Stock levels for consumables and supplies.</p>
        </div>
        <InventoryItemFormDialog mode="create" />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            aria-label="Search inventory"
            className="max-w-xs"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load inventory." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Boxes} title="No inventory items yet" description="Add your first item to start tracking stock." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <InventoryTable
              items={data.data}
              vendors={vendorPage?.data ?? []}
              sort={pagination.sort}
              onSortChange={pagination.setSort}
            />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
