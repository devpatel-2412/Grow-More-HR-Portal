import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Megaphone } from 'lucide-react';
import { usePublishAnnouncement } from '../hooks/useHrAutomation';
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

const announcementSchema = z
  .object({
    title: z.string().min(1, 'Required').max(300),
    body: z.string().min(1, 'Required').max(10000),
    audience: z.enum(['ALL', 'DEPARTMENT']),
    department: z.string(),
  })
  .refine((data) => data.audience !== 'DEPARTMENT' || data.department.trim().length > 0, {
    message: 'Pick a department',
    path: ['department'],
  });
type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export function PublishAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const publishMutation = usePublishAnnouncement();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    reset,
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', body: '', audience: 'ALL', department: '' },
  });
  const audience = watch('audience');

  async function onSubmit(values: AnnouncementFormValues) {
    try {
      await publishMutation.mutateAsync({
        title: values.title,
        body: values.body,
        audience: values.audience,
        department: values.audience === 'DEPARTMENT' ? values.department.trim() : undefined,
      });
      toast.success('Announcement published.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to publish this announcement.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Megaphone className="h-4 w-4" />
          New announcement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish an announcement</DialogTitle>
          <DialogDescription>Visible to everyone, or just one department.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="ann-title">Title</Label>
            <Input id="ann-title" {...register('title')} />
            {errors.title && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="ann-body">Message</Label>
            <Textarea id="ann-body" rows={4} {...register('body')} />
            {errors.body && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.body.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ann-audience">Audience</Label>
              <Controller
                control={control}
                name="audience"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ann-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Everyone</SelectItem>
                      <SelectItem value="DEPARTMENT">One department</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {audience === 'DEPARTMENT' && (
              <div>
                <Label htmlFor="ann-department">Department</Label>
                <Input id="ann-department" {...register('department')} />
                {errors.department && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.department.message}</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" loading={publishMutation.isPending}>
              Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
