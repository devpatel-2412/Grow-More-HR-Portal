import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';
import { submitLeaveSchema, LEAVE_TYPES, type SubmitLeaveFormValues } from '../schemas/leave.schemas';
import { useSubmitLeave } from '../hooks/useSubmitLeave';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

const LEAVE_TYPE_LABEL: Record<(typeof LEAVE_TYPES)[number], string> = {
  CASUAL: 'Casual leave',
  SICK: 'Sick leave',
  EARNED: 'Earned leave',
  PAID: 'Paid leave',
  UNPAID: 'Unpaid leave',
  COMP_OFF: 'Comp off',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
  WORK_FROM_HOME: 'Work from home',
  REMOTE_WORK: 'Remote work',
};

export function LeaveRequestDialog() {
  const [open, setOpen] = useState(false);
  const submitMutation = useSubmitLeave();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    reset,
  } = useForm<SubmitLeaveFormValues>({
    resolver: zodResolver(submitLeaveSchema),
    defaultValues: { leaveType: 'CASUAL', isHalfDay: false, startDate: '', endDate: '', reason: '' },
  });
  const isHalfDay = watch('isHalfDay');

  async function onSubmit(values: SubmitLeaveFormValues) {
    try {
      await submitMutation.mutateAsync(isHalfDay ? { ...values, endDate: values.startDate } : values);
      toast.success('Leave request submitted.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to submit leave request.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarPlus className="h-4 w-4" />
          Request leave
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
          <DialogDescription>Goes to your manager first, then HR for final approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="leave-type">Leave type</Label>
            <Controller
              control={control}
              name="leaveType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="leave-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {LEAVE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <input type="checkbox" className="rounded" {...register('isHalfDay')} />
            Half day
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leave-start">Start date</Label>
              <Input id="leave-start" type="date" {...register('startDate')} />
              {errors.startDate && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.startDate.message}</p>}
            </div>
            {!isHalfDay && (
              <div>
                <Label htmlFor="leave-end">End date</Label>
                <Input id="leave-end" type="date" {...register('endDate')} />
                {errors.endDate && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.endDate.message}</p>}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="leave-reason">Reason</Label>
            <Input id="leave-reason" placeholder="Brief reason" {...register('reason')} />
            {errors.reason && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={submitMutation.isPending}>
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
