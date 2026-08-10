import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus2, Pencil } from 'lucide-react';
import { createEmployeeSchema, updateEmployeeSchema, EMPLOYEE_STATUSES, type CreateEmployeeFormValues, type UpdateEmployeeFormValues } from '../schemas/employee.schemas';
import { useCreateEmployee } from '../hooks/useCreateEmployee';
import { useUpdateEmployee } from '../hooks/useUpdateEmployee';
import { useUsers } from '../../users/hooks/useUsers';
import { useBranches, useTeams } from '../../organization/hooks/useOrganization';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import type { EmployeeListItem } from '../types/employee.types';

interface CreateModeProps {
  mode: 'create';
  existingEmployeeUserIds: string[];
}

interface EditModeProps {
  mode: 'edit';
  employee: EmployeeListItem;
}

export function EmployeeFormDialog(props: CreateModeProps | EditModeProps) {
  const [open, setOpen] = useState(false);
  // The route already enforces this server-side (403 without it) — hiding the trigger is UX, not
  // the actual boundary. See the Roles & Permissions page for who currently holds these.
  const canCreate = useHasPermission('employee:create');
  const canUpdate = useHasPermission('employee:update');

  if (props.mode === 'create') {
    if (!canCreate) return null;
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <UserPlus2 className="h-4 w-4" />
            Add employee
          </Button>
        </DialogTrigger>
        <DialogContent>
          <CreateEmployeeForm existingEmployeeUserIds={props.existingEmployeeUserIds} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  if (!canUpdate) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Edit ${props.employee.firstName} ${props.employee.lastName}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <EditEmployeeForm employee={props.employee} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateEmployeeForm({ existingEmployeeUserIds, onDone }: { existingEmployeeUserIds: string[]; onDone: () => void }) {
  const createMutation = useCreateEmployee();
  // Deliberately no status filter: a just-invited user is `PENDING_INVITE` (not yet `ACTIVE`)
  // until they accept, but that's exactly who this dialog is for — letting an admin fill in
  // department/designation/employee ID/joining date right away instead of waiting on them to
  // log in first. acceptInvite() skips its own profile-creation step if one already exists.
  const { data: usersData } = useUsers({ page: 1, limit: 100 });
  const eligibleUsers = (usersData?.data ?? []).filter((u) => !existingEmployeeUserIds.includes(u.id));

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateEmployeeFormValues>({ resolver: zodResolver(createEmployeeSchema) });

  async function onSubmit(values: CreateEmployeeFormValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Employee profile created.');
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create employee profile.' });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add employee</DialogTitle>
        <DialogDescription>Creates an employee profile for an existing account without one yet.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div>
          <Label htmlFor="userId">User</Label>
          <Controller
            control={control}
            name="userId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="userId">
                  <SelectValue placeholder={eligibleUsers.length ? 'Select a user...' : 'No eligible users'} />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.userId && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.userId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.lastName.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="employeeId">Employee ID</Label>
          <Input id="employeeId" placeholder="EMP-2026-001" {...register('employeeId')} />
          {errors.employeeId && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.employeeId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register('department')} />
            {errors.department && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.department.message}</p>}
          </div>
          <div>
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" {...register('designation')} />
            {errors.designation && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.designation.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="dateOfJoining">Date of joining</Label>
          <Input id="dateOfJoining" type="date" {...register('dateOfJoining')} />
          {errors.dateOfJoining && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.dateOfJoining.message}</p>}
        </div>
        <DialogFooter>
          <Button type="submit" loading={createMutation.isPending}>
            Create profile
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

const NONE = '__none__';

function EditEmployeeForm({ employee, onDone }: { employee: EmployeeListItem; onDone: () => void }) {
  const updateMutation = useUpdateEmployee();
  const { data: branchPage } = useBranches({ page: 1, limit: 100 });
  const { data: teamPage } = useTeams({ page: 1, limit: 100 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<UpdateEmployeeFormValues>({
    resolver: zodResolver(updateEmployeeSchema),
    defaultValues: {
      phone: employee.phone ?? '',
      department: employee.department,
      designation: employee.designation,
      status: employee.status,
      branchId: employee.branchId ?? NONE,
      teamId: employee.teamId ?? NONE,
    },
  });

  async function onSubmit(values: UpdateEmployeeFormValues) {
    try {
      await updateMutation.mutateAsync({
        id: employee.id,
        values: {
          ...values,
          branchId: values.branchId === NONE ? null : values.branchId,
          teamId: values.teamId === NONE ? null : values.teamId,
        },
      });
      toast.success('Employee profile updated.');
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to update employee profile.' });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Edit {employee.firstName} {employee.lastName}
        </DialogTitle>
        <DialogDescription>{employee.employeeId}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-department">Department</Label>
            <Input id="edit-department" {...register('department')} />
            {errors.department && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.department.message}</p>}
          </div>
          <div>
            <Label htmlFor="edit-designation">Designation</Label>
            <Input id="edit-designation" {...register('designation')} />
            {errors.designation && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.designation.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="edit-phone">Phone</Label>
          <Input id="edit-phone" {...register('phone')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-branch">Branch</Label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-branch">
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
            <Label htmlFor="edit-team">Team</Label>
            <Controller
              control={control}
              name="teamId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-team">
                    <SelectValue placeholder="No team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No team</SelectItem>
                    {(teamPage?.data ?? []).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="edit-status">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" loading={updateMutation.isPending}>
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
