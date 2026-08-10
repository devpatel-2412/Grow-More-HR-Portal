import { ClipboardCheck } from 'lucide-react';
import { useLeaveApprovalQueue } from '../hooks/useLeaveApprovalQueue';
import { usePagination } from '../../../shared/hooks/usePagination';
import { LeaveApprovalTable } from '../components/LeaveApprovalTable';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function LeaveApprovalsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useLeaveApprovalQueue({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Leave Approvals"
      subtitle="Requests from your direct reports, plus HR-stage requests if you hold that permission."
      state={state}
      errorProps={{ description: 'Failed to load the approval queue.', onRetry: () => refetch() }}
      emptyProps={{ icon: ClipboardCheck, title: 'Nothing to review', description: 'Your leave approval queue is empty.' }}
    >
      {data && (
        <div className="space-y-4">
          <LeaveApprovalTable records={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
