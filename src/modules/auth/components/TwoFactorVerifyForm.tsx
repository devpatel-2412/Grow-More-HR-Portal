import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { twoFactorVerifySchema, type TwoFactorVerifyFormValues } from '../schemas/auth.schemas';
import { use2FAVerify } from '../hooks/use2FAVerify';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../../shared/components/ui/input-otp';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';

export function TwoFactorVerifyForm({ challengeToken }: { challengeToken: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const verifyMutation = use2FAVerify();
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo;
  const returnTo = redirectTo?.startsWith('/') ? redirectTo : '/';
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TwoFactorVerifyFormValues>({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: { challengeToken, code: '' },
  });

  async function onSubmit(values: TwoFactorVerifyFormValues) {
    try {
      const result = await verifyMutation.mutateAsync(values);
      setSession(result.accessToken, result.user);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Verification failed. Please try again.';
      setError('root', { message });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <InlineFormError message={errors.root?.message ?? errors.code?.message} />

      <div className="flex justify-center">
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <InputOTP maxLength={6} value={field.value} onChange={field.onChange} autoFocus>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
      </div>

      <Button type="submit" className="w-full" loading={verifyMutation.isPending}>
        Verify and continue
      </Button>
    </form>
  );
}
