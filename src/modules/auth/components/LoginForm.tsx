import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas';
import { useLogin } from '../hooks/useLogin';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { PasswordInput } from '../../../shared/components/ui/password-input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const loginMutation = useLogin();
  // Only ever follow a same-origin path ProtectedRoute itself set — never trust it further than that.
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo;
  const returnTo = redirectTo?.startsWith('/') ? redirectTo : '/';
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { rememberMe: false } });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await loginMutation.mutateAsync(values);
      if (result.requiresTwoFactor) {
        navigate('/two-factor', { state: { challengeToken: result.challengeToken, redirectTo } });
        return;
      }
      setSession(result.accessToken, result.user);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.';
      setError('root', { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <InlineFormError message={errors.root?.message} />

      <div>
        <Label htmlFor="email">Corporate email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@acme.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-[var(--destructive)]">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-[var(--destructive)]">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
          <input type="checkbox" className="rounded" {...register('rememberMe')} />
          Remember me
        </label>
        <Link to="/forgot-password" className="text-[var(--primary)] hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={loginMutation.isPending}>
        Sign in to platform
      </Button>
    </form>
  );
}
