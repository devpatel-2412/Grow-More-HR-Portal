import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { useCreateLead } from '../hooks/useCrm';
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

const leadSchema = z.object({
  companyName: z.string().min(1, 'Required').max(200),
  contactName: z.string().min(1, 'Required').max(160),
  email: z.string().email('Enter a valid email'),
  phone: z.string(),
  source: z.string(),
  estimatedValue: z.number().min(0, 'Cannot be negative'),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export function LeadDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateLead();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { companyName: '', contactName: '', email: '', phone: '', source: '', estimatedValue: 0 },
  });

  async function onSubmit(values: LeadFormValues) {
    try {
      await createMutation.mutateAsync({
        companyName: values.companyName,
        contactName: values.contactName,
        email: values.email,
        phone: values.phone.trim() || undefined,
        source: values.source.trim() || undefined,
        estimatedValue: values.estimatedValue,
      });
      toast.success('Lead added.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add this lead.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          New lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>Starts at the New stage of the funnel.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="lead-company">Company</Label>
            <Input id="lead-company" {...register('companyName')} />
            {errors.companyName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.companyName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lead-contact">Contact name</Label>
              <Input id="lead-contact" {...register('contactName')} />
              {errors.contactName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.contactName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lead-phone">Phone</Label>
              <Input id="lead-phone" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="lead-source">Source</Label>
              <Input id="lead-source" placeholder="Referral, website…" {...register('source')} />
            </div>
          </div>

          <div>
            <Label htmlFor="lead-value">Estimated value</Label>
            <Input id="lead-value" type="number" step="0.01" {...register('estimatedValue', { valueAsNumber: true })} />
            {errors.estimatedValue && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.estimatedValue.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
