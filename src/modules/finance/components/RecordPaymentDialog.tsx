import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';
import { recordPaymentFormSchema, type RecordPaymentFormValues } from '../schemas/finance.schemas';
import { useRecordPayment } from '../hooks/useFinance';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentDialog({ documentId, remaining }: { documentId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const recordMutation = useRecordPayment();
  const canManage = useHasPermission('finance:manage');
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues: { amount: remaining, paidAt: today(), method: '', reference: '' },
  });

  if (!canManage) return null;

  async function onSubmit(values: RecordPaymentFormValues) {
    try {
      await recordMutation.mutateAsync({
        id: documentId,
        payload: { amount: values.amount, paidAt: values.paidAt, method: values.method, reference: values.reference.trim() || undefined },
      });
      toast.success('Payment recorded.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to record this payment.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <DollarSign className="h-4 w-4" />
          Record payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>For money already received elsewhere — bank transfer, cheque, cash.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pay-amount">Amount</Label>
              <Input id="pay-amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="pay-date">Paid on</Label>
              <Input id="pay-date" type="date" {...register('paidAt')} />
              {errors.paidAt && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.paidAt.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="pay-method">Method</Label>
            <Input id="pay-method" placeholder="Bank transfer, cheque…" {...register('method')} />
            {errors.method && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.method.message}</p>}
          </div>

          <div>
            <Label htmlFor="pay-reference">Reference</Label>
            <Input id="pay-reference" placeholder="Transaction ID (optional)" {...register('reference')} />
          </div>

          <DialogFooter>
            <Button type="submit" loading={recordMutation.isPending}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
