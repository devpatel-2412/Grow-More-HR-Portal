import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createCommentSchema, type CreateCommentFormValues } from '../schemas/task.schemas';
import { useTaskComments, useAddComment } from '../hooks/useTaskComments';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

const MENTION_PATTERN = /(@[\w.-]+)/g;

/** Renders @name tokens highlighted — client-side only, no notification pipeline behind it yet. */
function renderWithMentions(body: string) {
  return body.split(MENTION_PATTERN).map((part, i) =>
    MENTION_PATTERN.test(part) ? (
      <span key={i} className="font-semibold text-[var(--primary)]">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TaskComments({ taskId }: { taskId: string }) {
  const { data: comments, isLoading } = useTaskComments(taskId);
  const addMutation = useAddComment(taskId);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCommentFormValues>({ resolver: zodResolver(createCommentSchema) });

  async function onSubmit(values: CreateCommentFormValues) {
    try {
      await addMutation.mutateAsync(values);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add comment.');
    }
  }

  return (
    <div className="space-y-3">
      {isLoading && <Skeleton className="h-16 w-full" />}
      {!isLoading && (
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] p-2 text-xs">
              <p className="text-[var(--foreground)]">{renderWithMentions(c.body)}</p>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{new Date(c.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {comments && comments.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">No comments yet.</p>}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2" noValidate>
        <div className="flex-1">
          <Input placeholder="Write a comment... use @name to mention someone" {...register('body')} />
          {errors.body && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.body.message}</p>}
        </div>
        <Button type="submit" size="sm" loading={addMutation.isPending}>
          Post
        </Button>
      </form>
    </div>
  );
}
