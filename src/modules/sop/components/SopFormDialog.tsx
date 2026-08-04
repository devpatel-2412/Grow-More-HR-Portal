import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { FilePlus2 } from 'lucide-react';
import { useCreateSop } from '../hooks/useSop';
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

const schema = z.object({
  title: z.string().min(1, 'Required').max(200),
  category: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  body: z.string().min(1, 'Required').max(50000),
});
type FormValues = z.infer<typeof schema>;

export function SopFormDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateSop();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await createMutation.mutateAsync({
        ...values,
        category: values.category || undefined,
        department: values.department || undefined,
      });
      toast.success('SOP created as a draft.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create this SOP.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" />
          New SOP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New SOP</DialogTitle>
          <DialogDescription>Starts as a draft — publish it once it's ready for the team to follow.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="sop-title">Title</Label>
            <Input id="sop-title" {...register('title')} />
            {errors.title && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sop-category">Category</Label>
              <Input id="sop-category" {...register('category')} />
            </div>
            <div>
              <Label htmlFor="sop-department">Department</Label>
              <Input id="sop-department" {...register('department')} />
            </div>
          </div>
          <div>
            <Label htmlFor="sop-body">Procedure</Label>
            <Textarea id="sop-body" rows={10} {...register('body')} />
            {errors.body && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.body.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
