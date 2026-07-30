import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { useDeleteTimeLog } from '../hooks/useTimeLogs';
import { ApiError } from '../../../shared/lib/api-client';
import type { TimeLogRecord } from '../types/timelog.types';

function formatStarted(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function TimeLogTable({ logs, taskTitles }: { logs: TimeLogRecord[]; taskTitles: Record<string, string> }) {
  const deleteMutation = useDeleteTimeLog();

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Time log deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this log.');
    }
  }

  if (logs.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No time logged yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Started</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap">{formatStarted(log.startedAt)}</TableCell>
            <TableCell>{log.taskId ? (taskTitles[log.taskId] ?? 'Task') : '—'}</TableCell>
            <TableCell className="text-xs text-[var(--muted-foreground)]">{log.description ?? '—'}</TableCell>
            <TableCell className="whitespace-nowrap font-medium">
              {log.endedAt ? formatDuration(log.durationMinutes) : 'Running…'}
            </TableCell>
            <TableCell>
              <Badge variant={log.source === 'TIMER' ? 'info' : 'neutral'}>{log.source}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button size="icon" variant="ghost" aria-label="Delete time log" onClick={() => remove(log.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
