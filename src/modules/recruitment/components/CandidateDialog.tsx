import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { useCreateCandidate } from '../hooks/useRecruitment';
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

const candidateSchema = z.object({
  firstName: z.string().min(1, 'Required').max(80),
  lastName: z.string().min(1, 'Required').max(80),
  email: z.string().email('Enter a valid email'),
  phone: z.string(),
  resumeUrl: z.string(),
  parsedSkills: z.string(),
  source: z.string(),
  notes: z.string(),
});

type CandidateFormValues = z.infer<typeof candidateSchema>;

export function CandidateDialog({ jobPostingId }: { jobPostingId: string }) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateCandidate();
  const canManage = useHasPermission('recruitment:manage');
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', resumeUrl: '', parsedSkills: '', source: '', notes: '' },
  });

  if (!canManage) return null;

  async function onSubmit(values: CandidateFormValues) {
    try {
      await createMutation.mutateAsync({
        jobPostingId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone.trim() || undefined,
        resumeUrl: values.resumeUrl.trim() || undefined,
        parsedSkills: values.parsedSkills.trim() || undefined,
        source: values.source.trim() || undefined,
        notes: values.notes.trim() || undefined,
      });
      toast.success('Candidate added.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add this candidate.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4" />
          Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add candidate</DialogTitle>
          <DialogDescription>Each email may only be used once per posting.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="candidate-first">First name</Label>
              <Input id="candidate-first" {...register('firstName')} />
              {errors.firstName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="candidate-last">Last name</Label>
              <Input id="candidate-last" {...register('lastName')} />
              {errors.lastName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="candidate-email">Email</Label>
            <Input id="candidate-email" type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="candidate-phone">Phone</Label>
              <Input id="candidate-phone" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="candidate-source">Source</Label>
              <Input id="candidate-source" placeholder="Referral, LinkedIn…" {...register('source')} />
            </div>
          </div>

          <div>
            <Label htmlFor="candidate-resume">Resume URL</Label>
            <Input id="candidate-resume" placeholder="https://…" {...register('resumeUrl')} />
          </div>

          <div>
            <Label htmlFor="candidate-skills">Skills</Label>
            <Input id="candidate-skills" placeholder="TypeScript, Postgres…" {...register('parsedSkills')} />
          </div>

          <div>
            <Label htmlFor="candidate-notes">Notes</Label>
            <Textarea id="candidate-notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Add candidate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
