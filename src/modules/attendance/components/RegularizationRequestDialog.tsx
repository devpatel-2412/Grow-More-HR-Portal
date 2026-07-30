import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { regularizationRequestSchema, type RegularizationRequestFormValues } from '../schemas/attendance.schemas';
import { useRequestRegularization } from '../hooks/useRegularizations';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';

export function RegularizationRequestDialog() {
  const [open, setOpen] = useState(false);
  const requestMutation = useRequestRegularization();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<RegularizationRequestFormValues>({ resolver: zodResolver(regularizationRequestSchema) });

  async function onSubmit(values: RegularizationRequestFormValues) {
    try {
      await requestMutation.mutateAsync(values);
      toast.success('Regularization request submitted.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to submit request.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock className="h-4 w-4" />
          Request correction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an attendance correction</DialogTitle>
          <DialogDescription>Your manager or HR will review this before it's applied.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message ?? errors.requestedCheckIn?.message} />
          <div>
            <Label htmlFor="reg-date">Date</Label>
            <Input id="reg-date" type="date" {...register('date')} />
            {errors.date && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reg-checkin">Corrected check-in</Label>
              <Input id="reg-checkin" type="datetime-local" {...register('requestedCheckIn')} />
            </div>
            <div>
              <Label htmlFor="reg-checkout">Corrected check-out</Label>
              <Input id="reg-checkout" type="datetime-local" {...register('requestedCheckOut')} />
            </div>
          </div>
          <div>
            <Label htmlFor="reg-reason">Reason</Label>
            <Input id="reg-reason" placeholder="e.g. Forgot to punch in" {...register('reason')} />
            {errors.reason && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" loading={requestMutation.isPending}>
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
