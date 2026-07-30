import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { passwordResetConfirmSchema, type PasswordResetConfirmFormValues } from '../schemas/auth.schemas';
import { useConfirmPasswordReset } from '../hooks/usePasswordReset';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';

export function PasswordResetForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const mutation = useConfirmPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<PasswordResetConfirmFormValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: { token },
  });

  async function onSubmit(values: PasswordResetConfirmFormValues) {
    try {
      await mutation.mutateAsync({ token: values.token, newPassword: values.newPassword });
      toast.success('Password reset successfully. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to reset password. The link may have expired.';
      setError('root', { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <InlineFormError message={errors.root?.message} />

      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
        {errors.newPassword && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.newPassword.message}</p>}
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-[var(--destructive)]">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" loading={mutation.isPending}>
        Reset password
      </Button>
    </form>
  );
}
