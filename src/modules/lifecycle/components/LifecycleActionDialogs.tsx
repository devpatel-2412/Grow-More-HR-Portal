import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  useConfirmEmployee,
  usePromoteEmployee,
  useTransferEmployee,
  useInitiateExit,
  useCompleteExit,
} from '../hooks/useLifecycle';
import { useBranches, useTeams } from '../../organization/hooks/useOrganization';
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

const NONE = '__none__';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- confirm

const confirmSchema = z.object({ effectiveDate: z.string().min(1, 'Required'), notes: z.string().max(2000).optional() });

export function ConfirmEmployeeDialog({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useConfirmEmployee(employeeId);
  const { register, handleSubmit, formState: { errors }, setError } = useForm<z.infer<typeof confirmSchema>>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { effectiveDate: todayIso() },
  });

  async function onSubmit(values: z.infer<typeof confirmSchema>) {
    try {
      await mutation.mutateAsync({ effectiveDate: values.effectiveDate, notes: values.notes });
      toast.success(`${employeeName} confirmed.`);
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to confirm this employee.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Confirm employee</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm {employeeName}</DialogTitle>
          <DialogDescription>Ends probation and moves this employee to Active.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="confirm-date">Effective date</Label>
            <Input id="confirm-date" type="date" {...register('effectiveDate')} />
          </div>
          <div>
            <Label htmlFor="confirm-notes">Notes</Label>
            <Textarea id="confirm-notes" rows={2} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={mutation.isPending}>
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- promote

const promoteSchema = z.object({
  effectiveDate: z.string().min(1, 'Required'),
  newDesignation: z.string().min(1, 'Required').max(80),
  newDepartment: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
});

export function PromoteEmployeeDialog({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [open, setOpen] = useState(false);
  const mutation = usePromoteEmployee(employeeId);
  const { register, handleSubmit, formState: { errors }, setError } = useForm<z.infer<typeof promoteSchema>>({
    resolver: zodResolver(promoteSchema),
    defaultValues: { effectiveDate: todayIso() },
  });

  async function onSubmit(values: z.infer<typeof promoteSchema>) {
    try {
      await mutation.mutateAsync(values);
      toast.success(`${employeeName} promoted.`);
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to promote this employee.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Promote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote {employeeName}</DialogTitle>
          <DialogDescription>Records a new designation (and optionally department) with an effective date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="promote-date">Effective date</Label>
            <Input id="promote-date" type="date" {...register('effectiveDate')} />
          </div>
          <div>
            <Label htmlFor="promote-designation">New designation</Label>
            <Input id="promote-designation" {...register('newDesignation')} />
            {errors.newDesignation && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.newDesignation.message}</p>}
          </div>
          <div>
            <Label htmlFor="promote-department">New department (optional)</Label>
            <Input id="promote-department" {...register('newDepartment')} />
          </div>
          <div>
            <Label htmlFor="promote-notes">Notes</Label>
            <Textarea id="promote-notes" rows={2} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={mutation.isPending}>
              Promote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- transfer

const transferSchema = z.object({
  effectiveDate: z.string().min(1, 'Required'),
  branchId: z.string(),
  teamId: z.string(),
  managerId: z.string(),
  notes: z.string().max(2000).optional(),
});

export function TransferEmployeeDialog({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useTransferEmployee(employeeId);
  const { data: branchPage } = useBranches({ page: 1, limit: 100 });
  const { data: teamPage } = useTeams({ page: 1, limit: 100 });
  const { data: employeePage } = useEmployees({ page: 1, limit: 200 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { effectiveDate: todayIso(), branchId: NONE, teamId: NONE, managerId: NONE },
  });

  async function onSubmit(values: z.infer<typeof transferSchema>) {
    try {
      await mutation.mutateAsync({
        effectiveDate: values.effectiveDate,
        notes: values.notes,
        branchId: values.branchId === NONE ? null : values.branchId,
        teamId: values.teamId === NONE ? null : values.teamId,
        managerId: values.managerId === NONE ? null : values.managerId,
      });
      toast.success(`${employeeName} transferred.`);
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to transfer this employee.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer {employeeName}</DialogTitle>
          <DialogDescription>Moves this employee to a new branch, team, or manager.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="transfer-date">Effective date</Label>
            <Input id="transfer-date" type="date" {...register('effectiveDate')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transfer-branch">Branch</Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="transfer-branch">
                      <SelectValue placeholder="No change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {(branchPage?.data ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="transfer-team">Team</Label>
              <Controller
                control={control}
                name="teamId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="transfer-team">
                      <SelectValue placeholder="No change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {(teamPage?.data ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="transfer-manager">Manager</Label>
            <Controller
              control={control}
              name="managerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="transfer-manager">
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {(employeePage?.data ?? [])
                      .filter((e) => e.id !== employeeId)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="transfer-notes">Notes</Label>
            <Textarea id="transfer-notes" rows={2} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={mutation.isPending}>
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- exit initiate

const initiateExitSchema = z.object({
  effectiveDate: z.string().min(1, 'Required'),
  reason: z.string().max(2000).optional(),
});

export function InitiateExitDialog({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useInitiateExit(employeeId);
  const { register, handleSubmit, formState: { errors }, setError } = useForm<z.infer<typeof initiateExitSchema>>({
    resolver: zodResolver(initiateExitSchema),
    defaultValues: { effectiveDate: todayIso() },
  });

  async function onSubmit(values: z.infer<typeof initiateExitSchema>) {
    try {
      await mutation.mutateAsync(values);
      toast.success(`Exit initiated for ${employeeName}.`);
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to initiate exit for this employee.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Initiate exit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate exit for {employeeName}</DialogTitle>
          <DialogDescription>Moves this employee to Offboarding as of their last working day.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="exit-date">Last working day</Label>
            <Input id="exit-date" type="date" {...register('effectiveDate')} />
          </div>
          <div>
            <Label htmlFor="exit-reason">Reason</Label>
            <Textarea id="exit-reason" rows={2} {...register('reason')} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" loading={mutation.isPending}>
              Initiate exit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- exit complete

const completeExitSchema = z.object({
  effectiveDate: z.string().min(1, 'Required'),
  outcome: z.enum(['TERMINATED', 'RESIGNED']),
  notes: z.string().max(2000).optional(),
});

export function CompleteExitDialog({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [open, setOpen] = useState(false);
  const mutation = useCompleteExit(employeeId);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<z.infer<typeof completeExitSchema>>({
    resolver: zodResolver(completeExitSchema),
    defaultValues: { effectiveDate: todayIso(), outcome: 'RESIGNED' },
  });

  async function onSubmit(values: z.infer<typeof completeExitSchema>) {
    try {
      await mutation.mutateAsync(values);
      toast.success(`Exit completed for ${employeeName}.`);
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to complete exit for this employee.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Complete exit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete exit for {employeeName}</DialogTitle>
          <DialogDescription>Sets the final status for this employee's record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="complete-exit-date">Effective date</Label>
            <Input id="complete-exit-date" type="date" {...register('effectiveDate')} />
          </div>
          <div>
            <Label htmlFor="complete-exit-outcome">Outcome</Label>
            <Controller
              control={control}
              name="outcome"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="complete-exit-outcome">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIGNED">Resigned</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="complete-exit-notes">Notes</Label>
            <Textarea id="complete-exit-notes" rows={2} {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" loading={mutation.isPending}>
              Complete exit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
