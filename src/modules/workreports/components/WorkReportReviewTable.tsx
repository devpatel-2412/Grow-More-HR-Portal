import { useState } from 'react';
import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { useReviewWorkReport } from '../hooks/useWorkReports';
import { ApiError } from '../../../shared/lib/api-client';
import type { WorkReportRecord } from '../types/workreport.types';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function WorkReportReviewTable({ reports }: { reports: WorkReportRecord[] }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const reviewMutation = useReviewWorkReport();

  async function review(id: string, status: 'APPROVED' | 'REJECTED') {
    try {
      await reviewMutation.mutateAsync({ id, status, reviewNote: notes[id]?.trim() || undefined });
      toast.success(status === 'APPROVED' ? 'Report approved.' : 'Report rejected.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to review this report.');
    }
  }

  if (reports.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Nothing awaiting your review.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Issues</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="text-right">Decision</TableHead>
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
            <TableCell className="text-xs text-[var(--muted-foreground)]">{report.issues ?? '—'}</TableCell>
            <TableCell>
              <Input
                aria-label={`Review note for ${formatDate(report.date)}`}
                placeholder="Optional"
                value={notes[report.id] ?? ''}
                onChange={(event) => setNotes((prev) => ({ ...prev, [report.id]: event.target.value }))}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => review(report.id, 'REJECTED')}>
                  Reject
                </Button>
                <Button size="sm" onClick={() => review(report.id, 'APPROVED')}>
                  Approve
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
