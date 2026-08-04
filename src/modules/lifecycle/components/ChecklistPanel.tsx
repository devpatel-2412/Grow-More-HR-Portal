import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2, ListChecks } from 'lucide-react';
import { useChecklist, useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from '../hooks/useLifecycle';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ChecklistPanel({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const { data: items, isLoading, isError, refetch } = useChecklist(employeeId);
  const createMutation = useCreateChecklistItem(employeeId);
  const updateMutation = useUpdateChecklistItem(employeeId);
  const deleteMutation = useDeleteChecklistItem(employeeId);
  const [label, setLabel] = useState('');

  async function addItem() {
    if (!label.trim()) return;
    try {
      await createMutation.mutateAsync(label.trim());
      setLabel('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to add this checklist item.');
    }
  }

  async function toggle(itemId: string, isCompleted: boolean) {
    try {
      await updateMutation.mutateAsync({ itemId, payload: { isCompleted } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update this checklist item.');
    }
  }

  async function remove(itemId: string) {
    try {
      await deleteMutation.mutateAsync(itemId);
      toast.success('Checklist item removed.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to remove this checklist item.');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState description="Failed to load the onboarding checklist." onRetry={() => refetch()} />;

  const rows = items ?? [];

  return (
    <div className="space-y-4 p-4">
      {canManage && (
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Add a checklist item..."
            aria-label="New checklist item"
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <Button size="sm" onClick={addItem} loading={createMutation.isPending}>
            Add
          </Button>
        </div>
      )}

      {rows.length === 0 && (
        <EmptyState icon={ListChecks} title="No checklist items" description="Nothing has been added to this onboarding checklist yet." />
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {rows.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={(checked) => toggle(item.id, checked === true)}
                disabled={!canManage}
                aria-label={item.label}
              />
              <span className={item.isCompleted ? 'flex-1 text-sm text-[var(--muted-foreground)] line-through' : 'flex-1 text-sm text-[var(--foreground)]'}>
                {item.label}
              </span>
              {canManage && (
                <Button size="icon" variant="ghost" aria-label={`Remove ${item.label}`} onClick={() => remove(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
