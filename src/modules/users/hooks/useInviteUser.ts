import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import type { InviteUserFormValues } from '../schemas/user.schemas';

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: InviteUserFormValues) => userApi.invite(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
