import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Users2, Pencil } from 'lucide-react';
import { useCreateTeam, useUpdateTeam } from '../hooks/useOrganization';
import { useBranches } from '../hooks/useOrganization';
import { useEmployees } from '../../employees/hooks/useEmployees';
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
import type { TeamRecord } from '../types/organization.types';

const NONE = '__none__';

const teamSchema = z.object({
  name: z.string().min(1, 'Required').max(120),
  description: z.string().max(1000).optional(),
  branchId: z.string(),
  leadId: z.string(),
});
type TeamFormValues = z.infer<typeof teamSchema>;

interface CreateModeProps {
  mode: 'create';
}

interface EditModeProps {
  mode: 'edit';
  team: TeamRecord;
}

export function TeamFormDialog(props: CreateModeProps | EditModeProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === 'create' ? (
          <Button size="sm">
            <Users2 className="h-4 w-4" />
            New team
          </Button>
        ) : (
          <Button size="sm" variant="outline" aria-label={`Edit ${props.team.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <TeamForm team={props.mode === 'edit' ? props.team : undefined} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TeamForm({ team, onDone }: { team?: TeamRecord; onDone: () => void }) {
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const isEdit = !!team;
  const { data: branchPage } = useBranches({ page: 1, limit: 100 });
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name ?? '',
      description: team?.description ?? '',
      branchId: team?.branchId ?? NONE,
      leadId: team?.leadId ?? NONE,
    },
  });

  async function onSubmit(values: TeamFormValues) {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      branchId: values.branchId === NONE ? (isEdit ? null : undefined) : values.branchId,
      leadId: values.leadId === NONE ? (isEdit ? null : undefined) : values.leadId,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: team.id, values: payload });
        toast.success('Team updated.');
      } else {
        await createMutation.mutateAsync(payload as { name: string; description?: string; branchId?: string; leadId?: string });
        toast.success('Team created.');
      }
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save this team.' });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? `Edit ${team.name}` : 'New team'}</DialogTitle>
        <DialogDescription>Groups employees under a lead, optionally tied to a branch.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div>
          <Label htmlFor="team-name">Name</Label>
          <Input id="team-name" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="team-description">Description</Label>
          <Textarea id="team-description" rows={2} {...register('description')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="team-branch">Branch</Label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="team-branch">
                    <SelectValue placeholder="No branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No branch</SelectItem>
                    {(branchPage?.data ?? []).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="team-lead">Lead</Label>
            <Controller
              control={control}
              name="leadId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="team-lead">
                    <SelectValue placeholder="No lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No lead</SelectItem>
                    {(employeePage?.data ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create team'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
