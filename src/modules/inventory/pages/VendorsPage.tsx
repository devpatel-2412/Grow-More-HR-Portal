import { Truck } from 'lucide-react';
import { useVendors } from '../hooks/useInventory';
import { VendorTable } from '../components/VendorTable';
import { VendorFormDialog } from '../components/VendorFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function VendorsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useVendors(pagination.queryParams);
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Vendors"
      subtitle="Suppliers your inventory is purchased from."
      actions={<VendorFormDialog mode="create" />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by name, contact, or email..."
          aria-label="Search vendors"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load vendors.', onRetry: () => refetch() }}
      emptyProps={{ icon: Truck, title: 'No vendors yet', description: 'Add your first supplier.' }}
    >
      {data && (
        <div className="space-y-4">
          <VendorTable vendors={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
