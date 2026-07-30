import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Badge } from '../../../shared/components/ui/badge';
import { TaskPriorityBadge } from './TaskBadges';
import type { TaskRecord, TaskStatus } from '../types/task.types';

const STATUS_VARIANT: Record<TaskStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  REVIEW: 'warning',
  DONE: 'success',
};

export function TaskListTable({ tasks, onOpenTask }: { tasks: TaskRecord[]; onOpenTask: (task: TaskRecord) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Logged hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenTask(task)}>
            <TableCell className="font-semibold">{task.title}</TableCell>
            <TableCell>
              <TaskPriorityBadge priority={task.priority} />
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[task.status]}>{task.status.replace('_', ' ')}</Badge>
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{task.loggedHours}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
