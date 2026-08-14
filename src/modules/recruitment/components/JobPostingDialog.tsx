import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { BriefcaseBusiness } from 'lucide-react';
import { useCreateJobPosting } from '../hooks/useRecruitment';
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

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] as const;
const POSTING_STATUSES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'CLOSED'] as const;

const jobPostingSchema = z.object({
  title: z.string().min(1, 'Required').max(200),
  description: z.string().min(1, 'Required'),
  department: z.string().min(1, 'Required').max(120),
  location: z.string().min(1, 'Required').max(200),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  openings: z.number().int().min(1, 'At least one opening'),
  minExperience: z.number().int().min(0, 'Cannot be negative'),
  status: z.enum(POSTING_STATUSES),
});

type JobPostingFormValues = z.infer<typeof jobPostingSchema>;

export function JobPostingDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateJobPosting();
  const canManage = useHasPermission('recruitment:manage');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<JobPostingFormValues>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      title: '',
      description: '',
      department: '',
      location: '',
      employmentType: 'FULL_TIME',
      openings: 1,
      minExperience: 0,
      status: 'DRAFT',
    },
  });

  if (!canManage) return null;

  async function onSubmit(values: JobPostingFormValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Job posting created.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create the job posting.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <BriefcaseBusiness className="h-4 w-4" />
          New posting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New job posting</DialogTitle>
          <DialogDescription>Drafts stay hidden until you set the posting to active.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="posting-title">Title</Label>
            <Input id="posting-title" {...register('title')} />
            {errors.title && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="posting-department">Department</Label>
              <Input id="posting-department" {...register('department')} />
              {errors.department && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.department.message}</p>}
            </div>
            <div>
              <Label htmlFor="posting-location">Location</Label>
              <Input id="posting-location" {...register('location')} />
              {errors.location && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.location.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="posting-description">Description</Label>
            <Textarea id="posting-description" rows={4} {...register('description')} />
            {errors.description && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="posting-openings">Openings</Label>
              <Input id="posting-openings" type="number" {...register('openings', { valueAsNumber: true })} />
              {errors.openings && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.openings.message}</p>}
            </div>
            <div>
              <Label htmlFor="posting-experience">Min. experience (years)</Label>
              <Input id="posting-experience" type="number" {...register('minExperience', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="posting-type">Employment type</Label>
              <Controller
                control={control}
                name="employmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="posting-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="posting-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="posting-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSTING_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Create posting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
