import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Flag, Plus } from 'lucide-react';
import { createMilestoneSchema, type CreateMilestoneFormValues } from '../schemas/project.schemas';
import { useMilestones, useCreateMilestone, useUpdateMilestoneStatus } from '../hooks/useMilestones';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';

export function MilestoneList({ projectId }: { projectId: string }) {
  const [showForm, setShowForm] = useState(false);
  const canManage = useHasPermission('project:manage');
  const { data: milestones, isLoading } = useMilestones(projectId);
  const createMutation = useCreateMilestone(projectId);
  const toggleMutation = useUpdateMilestoneStatus(projectId);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateMilestoneFormValues>({ resolver: zodResolver(createMilestoneSchema) });

  async function onSubmit(values: CreateMilestoneFormValues) {
    try {
      await createMutation.mutateAsync(values);
      reset();
      setShowForm(false);
      toast.success('Milestone added.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add milestone.');
    }
  }

  async function handleToggle(id: string, currentStatus: string) {
    try {
      await toggleMutation.mutateAsync({ id, status: currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update milestone.');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {milestones && milestones.length === 0 && !showForm && (
        <EmptyState icon={Flag} title="No milestones yet" description="Track key dates for this project." />
      )}

      {milestones && milestones.length > 0 && (
        <ul className="space-y-2">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={m.status === 'COMPLETED'}
                  disabled={!canManage}
                  onChange={() => canManage && handleToggle(m.id, m.status)}
                />
                <span className={m.status === 'COMPLETED' ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}>
                  {m.name}
                </span>
              </label>
              <span className="text-[var(--muted-foreground)]">{new Date(m.dueDate).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}

      {canManage &&
        (showForm ? (
          <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2" noValidate>
            <div className="flex-1">
              <Input placeholder="Milestone name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
            </div>
            <Input type="date" className="w-40" {...register('dueDate')} />
            <Button type="submit" size="sm" loading={createMutation.isPending}>
              Add
            </Button>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add milestone
          </Button>
        ))}
    </div>
  );
}
