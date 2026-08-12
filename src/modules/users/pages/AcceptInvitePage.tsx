import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import { acceptInviteSchema, type AcceptInviteFormValues } from '../schemas/user.schemas';
import { useAcceptInvite } from '../hooks/useAcceptInvite';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { PasswordInput } from '../../../shared/components/ui/password-input';
import { Label } from '../../../shared/components/ui/label';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/card';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { AuthLayout } from '../../../shared/components/layout/AuthLayout';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const acceptMutation = useAcceptInvite();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token: token ?? '', acceptedTerms: false as unknown as true },
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  async function onSubmit(values: AcceptInviteFormValues) {
    try {
      await acceptMutation.mutateAsync(values);
      toast.success('Account activated. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'This invite link is invalid or has expired.';
      setError('root', { message });
    }
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-(--primary) shadow-lg shadow-(--primary)/20">
            <UserCheck className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Join your team</CardTitle>
          <CardDescription>Set your name and password to activate your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
              {errors.firstName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
              {errors.lastName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.password.message}</p>}
          </div>
          <div>
            <label className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <Controller
                control={control}
                name="acceptedTerms"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} className="mt-0.5" />
                )}
              />
              I accept the company policy and terms of use
            </label>
            {errors.acceptedTerms && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.acceptedTerms.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={acceptMutation.isPending}>
            Activate account
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
