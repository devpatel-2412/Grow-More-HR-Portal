import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { inviteUserSchema, USER_ROLES, type InviteUserFormValues } from '../schemas/user.schemas';
import { useInviteUser } from '../hooks/useInviteUser';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const inviteMutation = useInviteUser();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<InviteUserFormValues>({ resolver: zodResolver(inviteUserSchema), defaultValues: { role: 'EMPLOYEE' } });

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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" loading={inviteMutation.isPending}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
