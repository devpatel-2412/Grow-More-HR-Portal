import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { signupSchema, type SignupFormValues } from '../schemas/auth.schemas';
import { useSignup } from '../hooks/useSignup';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';

export function SignupForm() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const signupMutation = useSignup();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupFormValues) {
    try {
      const result = await signupMutation.mutateAsync(values);
      setSession(result.accessToken, result.user);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to create your account. Please try again.';
      setError('root', { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <InlineFormError message={errors.root?.message} />

      <div className="grid grid-cols-2 gap-4">
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
        <Label htmlFor="tenantName">Organization name</Label>
        <Input id="tenantName" placeholder="Acme Inc" {...register('tenantName')} />
        {errors.tenantName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.tenantName.message}</p>}
      </div>

      <div>
        <Label htmlFor="tenantDomain">Workspace domain</Label>
        <Input id="tenantDomain" placeholder="acme" {...register('tenantDomain')} />
        {errors.tenantDomain && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.tenantDomain.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Corporate email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@acme.com" {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        {errors.password && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" loading={signupMutation.isPending}>
        Create your workspace
      </Button>
    </form>
  );
}
