import { useMutation } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import type { AcceptInviteFormValues } from '../schemas/user.schemas';

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (values: AcceptInviteFormValues) => userApi.acceptInvite(values),
  });
}
