import { toast } from 'sonner';
import { TASK_STATUSES } from '../schemas/task.schemas';
import { useUpdateTaskStatus } from '../hooks/useTasks';
import { TaskPriorityBadge } from './TaskBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import type { TaskRecord, TaskStatus } from '../types/task.types';

const COLUMN_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

export function KanbanBoard({ tasks, onOpenTask }: { tasks: TaskRecord[]; onOpenTask: (task: TaskRecord) => void }) {
  const updateStatus = useUpdateTaskStatus();

  async function handleStatusChange(id: string, status: TaskStatus) {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update task status.');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {TASK_STATUSES.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column);
        return (
          <div key={column} className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                {COLUMN_LABEL[column]}
              </span>
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                {columnTasks.length}
              </span>
            </div>
            <div className="min-h-[200px] space-y-3">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open task ${task.title}`}
                  className="glass-panel cursor-pointer space-y-2 rounded-xl p-3 transition-colors hover:border-[var(--primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  onClick={() => onOpenTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenTask(task);
                    }
                  }}
                >
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">{task.title}</h4>
                  <div className="flex items-center justify-between">
                    <TaskPriorityBadge priority={task.priority} />
                    {task.dueDate && (
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}>
                      <SelectTrigger className="h-7 text-[10px]" aria-label={`Change status for ${task.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {COLUMN_LABEL[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
