import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';

export function ChangePasswordForm() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      reset();
      toast.success('Password changed. Please log in again.');
      // Changing password revokes every refresh token server-side, so the current session
      // is dead too — send the user back through login rather than leaving a stale UI state.
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to change password.';
      setError('root', { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <InlineFormError message={errors.root?.message} />
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
        {errors.currentPassword && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.currentPassword.message}</p>}
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
        {errors.newPassword && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.newPassword.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" size="sm" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}
