import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { SignupFormValues } from '../schemas/auth.schemas';

export function useSignup() {
  return useMutation({
    mutationFn: (values: SignupFormValues) => authApi.signup(values),
  });
}
