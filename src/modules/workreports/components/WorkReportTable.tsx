import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { WorkReportStatusBadge } from './WorkReportStatusBadge';
import type { WorkReportRecord } from '../types/workreport.types';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function WorkReportTable({ reports }: { reports: WorkReportRecord[] }) {
  if (reports.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No work reports yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Pending</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell className="whitespace-nowrap font-medium">{formatDate(report.date)}</TableCell>
            <TableCell>
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {report.completedTasks.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </TableCell>
            <TableCell className="text-xs text-[var(--muted-foreground)]">
              {report.pendingTasks.length ? report.pendingTasks.join(', ') : '—'}
            </TableCell>
            <TableCell className="whitespace-nowrap">{formatDuration(report.timeSpentMinutes)}</TableCell>
            <TableCell>
              <WorkReportStatusBadge status={report.status} />
              {report.reviewNote && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{report.reviewNote}</p>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
