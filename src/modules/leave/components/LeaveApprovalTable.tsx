import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import { useManagerReview, useHrReview } from '../hooks/useLeaveApprovalQueue';
import { ApiError } from '../../../shared/lib/api-client';
import type { LeaveRequestRecord } from '../types/leave.types';

export function LeaveApprovalTable({ records }: { records: LeaveRequestRecord[] }) {
  const managerReview = useManagerReview();
  const hrReview = useHrReview();

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
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
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
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <button type="button" className="text-emerald-500 hover:underline" onClick={() => handleReview(r, 'APPROVED')}>
                  Approve
                </button>
                <button type="button" className="text-[var(--destructive)] hover:underline" onClick={() => handleReview(r, 'REJECTED')}>
                  Reject
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
