import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { useAddContact } from '../hooks/useCrm';
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

const contactSchema = z.object({
  name: z.string().min(1, 'Required').max(160),
  email: z.string().email('Enter a valid email'),
  phone: z.string(),
  designation: z.string(),
  isPrimary: z.boolean(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactDialog({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const addMutation = useAddContact();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', designation: '', isPrimary: false },
  });

  async function onSubmit(values: ContactFormValues) {
    try {
      await addMutation.mutateAsync({
        clientId,
        payload: {
          name: values.name,
          email: values.email,
          phone: values.phone.trim() || undefined,
          designation: values.designation.trim() || undefined,
          isPrimary: values.isPrimary,
        },
      });
      toast.success('Contact added.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add this contact.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4" />
          Add contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>Marking a contact primary demotes any existing primary.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="contact-designation">Title</Label>
              <Input id="contact-designation" {...register('designation')} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <input type="checkbox" className="rounded" {...register('isPrimary')} />
            Primary contact
          </label>

          <DialogFooter>
            <Button type="submit" loading={addMutation.isPending}>
              Add contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
