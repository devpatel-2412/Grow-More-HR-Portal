import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Building2 } from 'lucide-react';
import { useCreateClient } from '../hooks/useCrm';
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

const clientSchema = z.object({
  companyName: z.string().min(1, 'Required').max(200),
  contactEmail: z.string().email('Enter a valid email'),
  phone: z.string(),
  website: z.string(),
  industry: z.string(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function ClientDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { companyName: '', contactEmail: '', phone: '', website: '', industry: '' },
  });

  async function onSubmit(values: ClientFormValues) {
    try {
      await createMutation.mutateAsync({
        companyName: values.companyName,
        contactEmail: values.contactEmail,
        phone: values.phone.trim() || undefined,
        website: values.website.trim() || undefined,
        industry: values.industry.trim() || undefined,
      });
      toast.success('Client added.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add this client.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Building2 className="h-4 w-4" />
          New client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>For accounts that never went through the lead pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="client-company">Company</Label>
            <Input id="client-company" {...register('companyName')} />
            {errors.companyName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.companyName.message}</p>}
          </div>

          <div>
            <Label htmlFor="client-email">Contact email</Label>
            <Input id="client-email" type="email" {...register('contactEmail')} />
            {errors.contactEmail && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.contactEmail.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client-phone">Phone</Label>
              <Input id="client-phone" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="client-industry">Industry</Label>
              <Input id="client-industry" {...register('industry')} />
            </div>
          </div>

          <div>
            <Label htmlFor="client-website">Website</Label>
            <Input id="client-website" placeholder="https://…" {...register('website')} />
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Add client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
