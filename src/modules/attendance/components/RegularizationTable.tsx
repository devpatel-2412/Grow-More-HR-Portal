import { toast } from 'sonner';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { useReviewRegularization } from '../hooks/useRegularizations';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import type { RegularizationRequest, RegularizationStatus } from '../types/attendance.types';

const STATUS_VARIANT: Record<RegularizationStatus, 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export function RegularizationTable({ requests }: { requests: RegularizationRequest[] }) {
  const reviewMutation = useReviewRegularization();
  const canApprove = useHasPermission('attendance:regularization:approve');

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await reviewMutation.mutateAsync({ id, status });
      toast.success(status === 'APPROVED' ? 'Request approved.' : 'Request rejected.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to review request.');
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Requested check-in</TableHead>
          <TableHead>Requested check-out</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          {canApprove && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-semibold">{new Date(r.date).toLocaleDateString()}</TableCell>
            <TableCell>{formatDateTime(r.requestedCheckIn)}</TableCell>
            <TableCell>{formatDateTime(r.requestedCheckOut)}</TableCell>
            <TableCell className="max-w-xs truncate text-[var(--muted-foreground)]" title={r.reason}>
              {r.reason}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
            </TableCell>
            {canApprove && (
              <TableCell className="text-right">
                {r.status === 'PENDING' ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-emerald-500 hover:underline"
                      onClick={() => handleReview(r.id, 'APPROVED')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="text-[var(--destructive)] hover:underline"
                      onClick={() => handleReview(r.id, 'REJECTED')}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-[var(--muted-foreground)]">Reviewed</span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
