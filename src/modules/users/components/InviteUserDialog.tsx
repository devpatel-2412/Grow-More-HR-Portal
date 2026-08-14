import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { inviteUserSchema, STAFF_ROLES, type InviteUserFormValues } from '../schemas/user.schemas';
import { useInviteUser } from '../hooks/useInviteUser';
import { useInvitableRoles } from '../hooks/useInvitableRoles';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const canInvite = useHasPermission('user:invite');
  const inviteMutation = useInviteUser();
  // The caller's own allowed invite-target roles (see INVITABLE_ROLES on the server) — a role
  // without USER_INVITE granted for a given target role simply never sees it as an option here,
  // rather than being able to pick it and get a 403 on submit.
  const { data: invitableRolesData } = useInvitableRoles();
  const invitableRoles = STAFF_ROLES.filter((role) => invitableRolesData?.roles.includes(role));
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
    setValue,
  } = useForm<InviteUserFormValues>({ resolver: zodResolver(inviteUserSchema), defaultValues: { role: 'EMPLOYEE' } });

  // The form defaults to EMPLOYEE before the invitable-roles list has loaded — once it's in and
  // EMPLOYEE isn't actually one of the caller's allowed targets, fall back to whatever they can
  // pick first, so the preselected value in the dropdown is never one submit would reject.
  useEffect(() => {
    if (invitableRoles.length > 0 && !invitableRoles.includes('EMPLOYEE')) {
      setValue('role', invitableRoles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitableRolesData]);

  if (!canInvite) return null;

  async function onSubmit(values: InviteUserFormValues) {
    try {
      await inviteMutation.mutateAsync(values);
      toast.success(`Invite sent to ${values.email}`);
      reset();
      setOpen(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to send invite.';
      setError('root', { message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>They'll receive an email with a link to set their password and join.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" autoComplete="off" placeholder="teammate@acme.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={invitableRoles.length === 0}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {invitableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {invitableRolesData && invitableRoles.length === 0 && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                You don't have permission to invite anyone. Ask an administrator to grant it.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" loading={inviteMutation.isPending} disabled={invitableRoles.length === 0}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
