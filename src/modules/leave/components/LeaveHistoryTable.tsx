import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import { useCancelLeave } from '../hooks/useCancelLeave';
import { ApiError } from '../../../shared/lib/api-client';
import type { LeaveRequestRecord } from '../types/leave.types';

export function LeaveHistoryTable({ records }: { records: LeaveRequestRecord[] }) {
  const cancelMutation = useCancelLeave();

  async function handleCancel(id: string) {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Leave request cancelled.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to cancel request.');
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
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
            <TableCell>
              <LeaveStatusBadge status={r.status} />
            </TableCell>
            <TableCell className="text-right">
              {(r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR') && (
                <button type="button" className="text-[var(--destructive)] hover:underline" onClick={() => handleCancel(r.id)}>
                  Cancel
                </button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
