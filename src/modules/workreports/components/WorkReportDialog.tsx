import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FilePlus2 } from 'lucide-react';
import { submitWorkReportSchema, toLines, type SubmitWorkReportFormValues } from '../schemas/workreport.schemas';
import { useSubmitWorkReport } from '../hooks/useWorkReports';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Textarea } from '../../../shared/components/ui/textarea';
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WorkReportDialog() {
  const [open, setOpen] = useState(false);
  const submitMutation = useSubmitWorkReport();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<SubmitWorkReportFormValues>({
    resolver: zodResolver(submitWorkReportSchema),
    defaultValues: {
      date: today(),
      completedTasks: '',
      pendingTasks: '',
      tomorrowPlan: '',
      issues: '',
      timeSpentMinutes: 480,
    },
  });

  async function onSubmit(values: SubmitWorkReportFormValues) {
    try {
      await submitMutation.mutateAsync({
        date: values.date,
        completedTasks: toLines(values.completedTasks),
        pendingTasks: toLines(values.pendingTasks),
        tomorrowPlan: toLines(values.tomorrowPlan),
        issues: values.issues.trim() || undefined,
        timeSpentMinutes: values.timeSpentMinutes,
      });
      toast.success('Work report submitted.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to submit work report.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" />
          Submit report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily work report</DialogTitle>
          <DialogDescription>One report per day. Put each item on its own line.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="report-date">Date</Label>
              <Input id="report-date" type="date" {...register('date')} />
              {errors.date && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.date.message}</p>}
            </div>
            <div>
              <Label htmlFor="report-minutes">Time spent (minutes)</Label>
              <Input id="report-minutes" type="number" {...register('timeSpentMinutes', { valueAsNumber: true })} />
              {errors.timeSpentMinutes && (
                <p className="mt-1 text-xs text-[var(--destructive)]">{errors.timeSpentMinutes.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="report-completed">What you completed</Label>
            <Textarea id="report-completed" rows={3} placeholder="One item per line" {...register('completedTasks')} />
            {errors.completedTasks && (
              <p className="mt-1 text-xs text-[var(--destructive)]">{errors.completedTasks.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="report-pending">Still pending</Label>
            <Textarea id="report-pending" rows={2} placeholder="One item per line" {...register('pendingTasks')} />
          </div>

          <div>
            <Label htmlFor="report-tomorrow">Plan for tomorrow</Label>
            <Textarea id="report-tomorrow" rows={2} placeholder="One item per line" {...register('tomorrowPlan')} />
          </div>

          <div>
            <Label htmlFor="report-issues">Blockers or issues</Label>
            <Textarea id="report-issues" rows={2} placeholder="Anything that slowed you down" {...register('issues')} />
          </div>

          <DialogFooter>
            <Button type="submit" loading={submitMutation.isPending}>
              Submit report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
