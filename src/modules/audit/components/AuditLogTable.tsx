import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import type { AuditLogEntry } from '../types/audit.types';

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>IP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="whitespace-nowrap text-[var(--muted-foreground)]">
              {new Date(entry.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant="info">{entry.action.replace(/_/g, ' ')}</Badge>
            </TableCell>
            <TableCell className="font-mono text-[10px] text-[var(--muted-foreground)]">
              {entry.actorUserId ? `${entry.actorUserId.slice(0, 8)}...` : 'System'}
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">
              {entry.targetType ? `${entry.targetType}${entry.targetId ? ` (${entry.targetId.slice(0, 8)}...)` : ''}` : '—'}
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{entry.ipAddress ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
