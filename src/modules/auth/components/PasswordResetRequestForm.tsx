import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { passwordResetRequestSchema, type PasswordResetRequestFormValues } from '../schemas/auth.schemas';
import { useRequestPasswordReset } from '../hooks/usePasswordReset';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';

export function PasswordResetRequestForm() {
  const mutation = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<PasswordResetRequestFormValues>({ resolver: zodResolver(passwordResetRequestSchema) });

  async function onSubmit(values: PasswordResetRequestFormValues) {
    await mutation.mutateAsync(values.email);
    toast.success('If an account exists for this email, a reset link has been sent.');
  }

  if (isSubmitSuccessful) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]" role="status">
        Check your email for a link to reset your password.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Corporate email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@acme.com" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
      </div>
      <Button type="submit" className="w-full" loading={mutation.isPending}>
        Send reset link
      </Button>
    </form>
  );
}
