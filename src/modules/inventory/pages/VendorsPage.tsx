import { Truck } from 'lucide-react';
import { useVendors } from '../hooks/useInventory';
import { VendorTable } from '../components/VendorTable';
import { VendorFormDialog } from '../components/VendorFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function VendorsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useVendors(pagination.queryParams);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Vendors</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Suppliers your inventory is purchased from.</p>
        </div>
        <VendorFormDialog mode="create" />
      </div>

      <Card>
        <div className="mb-4">
          <Input
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            placeholder="Search by name, contact, or email..."
            aria-label="Search vendors"
            className="max-w-xs"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load vendors." onRetry={() => refetch()} />}

        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={Truck} title="No vendors yet" description="Add your first supplier." />
        )}

        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <VendorTable vendors={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
