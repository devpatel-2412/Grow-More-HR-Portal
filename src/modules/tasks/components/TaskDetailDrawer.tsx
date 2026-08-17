import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Paperclip } from 'lucide-react';
import { createAttachmentSchema, type CreateAttachmentFormValues } from '../schemas/task.schemas';
import { useUpdateTaskStatus } from '../hooks/useTasks';
import { useTaskAttachments, useAddAttachment } from '../hooks/useTaskComments';
import { TaskComments } from './TaskComments';
import { TaskPriorityBadge } from './TaskBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../shared/components/ui/dialog';
import type { TaskRecord } from '../types/task.types';

function SubtaskChecklist({ subtasks }: { subtasks: TaskRecord[] | null | undefined }) {
  const updateStatus = useUpdateTaskStatus();
  const items = subtasks ?? [];

  async function toggle(subtask: TaskRecord) {
    try {
      await updateStatus.mutateAsync({ id: subtask.id, status: subtask.status === 'DONE' ? 'TODO' : 'DONE' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update checklist item.');
    }
  }

  if (items.length === 0) return <p className="text-xs text-[var(--muted-foreground)]">No checklist items.</p>;

  return (
    <ul className="space-y-1">
      {items.map((s) => (
        <li key={s.id} className="flex items-center gap-2 text-xs">
          <input type="checkbox" className="rounded" checked={s.status === 'DONE'} onChange={() => toggle(s)} />
          <span className={s.status === 'DONE' ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}>
            {s.title}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AttachmentsPanel({ taskId }: { taskId: string }) {
  const [showForm, setShowForm] = useState(false);
  const { data: attachments } = useTaskAttachments(taskId);
  const addMutation = useAddAttachment(taskId);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateAttachmentFormValues>({ resolver: zodResolver(createAttachmentSchema) });

  async function onSubmit(values: CreateAttachmentFormValues) {
    try {
      await addMutation.mutateAsync(values);
      reset();
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add attachment.');
    }
  }

  return (
    <div className="space-y-2">
      {(attachments ?? []).map((a) => (
        <a
          key={a.id}
          href={a.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-[var(--primary)] hover:underline"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {a.fileName}
        </a>
      ))}
      {showForm ? (
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2" noValidate>
          <Input placeholder="File name" {...register('fileName')} />
          <Input placeholder="https://..." {...register('fileUrl')} />
          <Button type="submit" size="sm" loading={addMutation.isPending}>
            Add
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Paperclip className="h-3.5 w-3.5" />
          Add link
        </Button>
      )}
      {(errors.fileName || errors.fileUrl) && (
        <p className="text-xs text-[var(--destructive)]">{errors.fileName?.message ?? errors.fileUrl?.message}</p>
      )}
    </div>
  );
}

export function TaskDetailDrawer({ task, onClose }: { task: TaskRecord | null; onClose: () => void }) {
  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      {task && (
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            {task.description && <DialogDescription>{task.description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center gap-3 text-xs">
              <TaskPriorityBadge priority={task.priority} />
              {task.dueDate && <span className="text-[var(--muted-foreground)]">Due {new Date(task.dueDate).toLocaleDateString()}</span>}
              <span className="text-[var(--muted-foreground)]">{task.loggedHours}h logged</span>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Checklist</h4>
              <SubtaskChecklist subtasks={task.subtasks} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Attachments</h4>
              <AttachmentsPanel taskId={task.id} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Comments</h4>
              <TaskComments taskId={task.id} />
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
