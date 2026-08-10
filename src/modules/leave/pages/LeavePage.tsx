import { CalendarOff } from 'lucide-react';
import { useMyLeave } from '../hooks/useMyLeave';
import { usePagination } from '../../../shared/hooks/usePagination';
import { LeaveRequestDialog } from '../components/LeaveRequestDialog';
import { LeaveHistoryTable } from '../components/LeaveHistoryTable';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function LeavePage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useMyLeave({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Leave"
      subtitle="Request time off and track your approval status."
      maxWidth="4xl"
      actions={<LeaveRequestDialog />}
      state={state}
      errorProps={{ description: 'Failed to load your leave history.', onRetry: () => refetch() }}
      emptyProps={{ icon: CalendarOff, title: 'No leave requests yet', description: 'Submit your first request to get started.' }}
    >
      {data && (
        <div className="space-y-4">
          <LeaveHistoryTable records={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
