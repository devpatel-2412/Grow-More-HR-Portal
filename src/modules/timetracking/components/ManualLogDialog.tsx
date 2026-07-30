import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useCreateManualLog } from '../hooks/useTimeLogs';
import { useTasks } from '../../tasks/hooks/useTasks';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

const NO_TASK = '__none__';

const manualLogSchema = z.object({
  taskId: z.string(),
  description: z.string(),
  startedAt: z.string().min(1, 'Required'),
  durationMinutes: z.number().int().min(1, 'Must be at least a minute').max(1440, 'A day only has 1440 minutes'),
});

type ManualLogFormValues = z.infer<typeof manualLogSchema>;

function nowLocalInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function ManualLogDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateManualLog();
  const { data: taskPage } = useTasks({ page: 1, limit: 100 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ManualLogFormValues>({
    resolver: zodResolver(manualLogSchema),
    defaultValues: { taskId: NO_TASK, description: '', startedAt: nowLocalInput(), durationMinutes: 60 },
  });

  async function onSubmit(values: ManualLogFormValues) {
    try {
      await createMutation.mutateAsync({
        taskId: values.taskId === NO_TASK ? undefined : values.taskId,
        description: values.description.trim() || undefined,
        startedAt: new Date(values.startedAt).toISOString(),
        durationMinutes: values.durationMinutes,
      });
      toast.success('Time logged.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to log time.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          Log time
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log time manually</DialogTitle>
          <DialogDescription>For work you did without running the timer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="manual-task">Task (optional)</Label>
            <Controller
              control={control}
              name="taskId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="manual-task">
                    <SelectValue placeholder="No task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TASK}>No task</SelectItem>
                    {(taskPage?.data ?? []).map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manual-started">Started at</Label>
              <Input id="manual-started" type="datetime-local" {...register('startedAt')} />
              {errors.startedAt && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.startedAt.message}</p>}
            </div>
            <div>
              <Label htmlFor="manual-duration">Duration (minutes)</Label>
              <Input id="manual-duration" type="number" {...register('durationMinutes', { valueAsNumber: true })} />
              {errors.durationMinutes && (
                <p className="mt-1 text-xs text-[var(--destructive)]">{errors.durationMinutes.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="manual-description">Description</Label>
            <Input id="manual-description" placeholder="Optional note" {...register('description')} />
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Log time
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
