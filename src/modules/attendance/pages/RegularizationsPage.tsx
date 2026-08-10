import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useRegularizations } from '../hooks/useRegularizations';
import { usePagination } from '../../../shared/hooks/usePagination';
import { RegularizationTable } from '../components/RegularizationTable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';
import type { RegularizationStatus } from '../types/attendance.types';

export function RegularizationsPage() {
  const pagination = usePagination(20);
  const [status, setStatus] = useState<RegularizationStatus | 'ALL'>('PENDING');
  const { data, isLoading, isError, refetch } = useRegularizations({
    page: pagination.page,
    limit: pagination.limit,
    status: status === 'ALL' ? undefined : status,
  });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Attendance Regularizations"
      subtitle="Review and approve attendance correction requests."
      filters={
        <Select value={status} onValueChange={(v) => setStatus(v as RegularizationStatus | 'ALL')}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      }
      state={state}
      errorProps={{ description: 'Failed to load regularization requests.', onRetry: () => refetch() }}
      emptyProps={{ icon: ClipboardList, title: 'Nothing here', description: 'No regularization requests match this filter.' }}
    >
      {data && (
        <div className="space-y-4">
          <RegularizationTable requests={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
