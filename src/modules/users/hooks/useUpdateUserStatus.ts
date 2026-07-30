import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import type { UserStatus } from '../../auth/types/auth.types';

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => userApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
