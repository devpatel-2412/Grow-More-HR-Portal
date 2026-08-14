import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import { useManagerReview, useHrReview } from '../hooks/useLeaveApprovalQueue';
import { usePermissions } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import type { LeaveRequestRecord } from '../types/leave.types';

export function LeaveApprovalTable({ records }: { records: LeaveRequestRecord[] }) {
  const managerReview = useManagerReview();
  const hrReview = useHrReview();
  const { hasAny } = usePermissions();
  // Mirrors the backend's exact authorization per stage (leave.routes.ts): manager-review is
  // deliberately loose-gated (LEAVE_APPROVE_MANAGER or LEAVE_APPLY, with real enforcement being
  // org-chart ownership in the service), while hr-review strictly requires LEAVE_APPROVE_HR.
  const canReviewManagerStage = hasAny(['leave:approve:manager', 'leave:apply']);
  const canReviewHrStage = hasAny(['leave:approve:hr']);
  const showActionsColumn = canReviewManagerStage || canReviewHrStage;

  async function handleReview(record: LeaveRequestRecord, status: 'APPROVED' | 'REJECTED') {
    const mutation = record.status === 'PENDING_MANAGER' ? managerReview : hrReview;
    try {
      await mutation.mutateAsync({ id: record.id, status });
      toast.success(status === 'APPROVED' ? 'Approved.' : 'Rejected.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to review request.');
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Stage</TableHead>
          {showActionsColumn && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => {
          const canReviewThisRow = r.status === 'PENDING_MANAGER' ? canReviewManagerStage : r.status === 'PENDING_HR' ? canReviewHrStage : false;
          return (
            <TableRow key={r.id}>
              <TableCell className="font-semibold">{r.leaveType.replace(/_/g, ' ')}</TableCell>
              <TableCell>
                {new Date(r.startDate).toLocaleDateString()}
                {r.startDate !== r.endDate && ` – ${new Date(r.endDate).toLocaleDateString()}`}
              </TableCell>
              <TableCell>{r.totalDays}</TableCell>
              <TableCell className="max-w-xs truncate text-[var(--muted-foreground)]" title={r.reason}>
                {r.reason}
              </TableCell>
              <TableCell>
                <LeaveStatusBadge status={r.status} />
              </TableCell>
              {showActionsColumn && (
                <TableCell className="text-right">
                  {canReviewThisRow ? (
                    <div className="flex justify-end gap-2">
                      <button type="button" className="text-emerald-500 hover:underline" onClick={() => handleReview(r, 'APPROVED')}>
                        Approve
                      </button>
                      <button type="button" className="text-[var(--destructive)] hover:underline" onClick={() => handleReview(r, 'REJECTED')}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
