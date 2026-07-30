import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance.types';

const STATUS_VARIANT: Record<AttendanceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PRESENT: 'success',
  LATE: 'warning',
  HALFDAY: 'warning',
  ABSENT: 'danger',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AttendanceHistoryTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Late</TableHead>
          <TableHead>Over break</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-semibold">{new Date(r.date).toLocaleDateString()}</TableCell>
            <TableCell>{formatTime(r.checkIn)}</TableCell>
            <TableCell>{formatTime(r.checkOut)}</TableCell>
            <TableCell className={r.lateMinutes > 0 ? 'text-amber-500' : 'text-[var(--muted-foreground)]'}>
              {r.lateMinutes > 0 ? `${r.lateMinutes} min` : '—'}
            </TableCell>
            <TableCell className={r.overBreakMinutes > 0 ? 'text-amber-500' : 'text-[var(--muted-foreground)]'}>
              {r.overBreakMinutes > 0 ? `${r.overBreakMinutes} min` : '—'}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
