import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Ticket as TicketIcon } from 'lucide-react';
import { useCreateTicket } from '../hooks/useWorkplace';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

const CATEGORIES = ['HR', 'IT', 'FINANCE', 'SUPPORT'] as const;

const ticketSchema = z.object({
  category: z.enum(CATEGORIES),
  subject: z.string().min(1, 'Required').max(300),
  description: z.string().min(1, 'Required').max(8000),
});
type TicketFormValues = z.infer<typeof ticketSchema>;

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateTicket();
  const canCreate = useHasPermission('ticket:create');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: 'IT', subject: '', description: '' },
  });

  if (!canCreate) return null;

  async function onSubmit(values: TicketFormValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Ticket submitted.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to submit this ticket.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <TicketIcon className="h-4 w-4" />
          New ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a ticket</DialogTitle>
          <DialogDescription>Goes into the queue for the right team to pick up.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="ticket-category">Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="ticket-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input id="ticket-subject" {...register('subject')} />
            {errors.subject && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.subject.message}</p>}
          </div>

          <div>
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea id="ticket-description" rows={4} {...register('description')} />
            {errors.description && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
