import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { TwoFactorVerifyFormValues } from '../schemas/auth.schemas';

export function use2FAVerify() {
  return useMutation({
    mutationFn: (values: TwoFactorVerifyFormValues) => authApi.verifyTwoFactor(values),
  });
}
