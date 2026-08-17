import { BookOpen } from 'lucide-react';
import { useSops } from '../hooks/useSop';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { SopTable } from '../components/SopTable';
import { SopFormDialog } from '../components/SopFormDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function SopsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useSops(pagination.queryParams);
  const canManage = useHasPermission('sop:manage');
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="SOP Library"
      subtitle="Standard operating procedures, versioned as they change."
      actions={canManage ? <SopFormDialog /> : undefined}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search by title or content..."
          aria-label="Search SOPs"
          className="max-w-xs"
        />
      }
      state={state}
      errorProps={{ description: 'Failed to load the SOP library.', onRetry: () => refetch() }}
      emptyProps={{ icon: BookOpen, title: 'No SOPs yet', description: 'Create your first standard operating procedure.' }}
    >
      {data && (
        <div className="space-y-4">
          <SopTable sops={data.data} sort={pagination.sort} onSortChange={pagination.setSort} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
