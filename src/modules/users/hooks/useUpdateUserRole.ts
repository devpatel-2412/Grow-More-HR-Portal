import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import type { UserRole } from '../../auth/types/auth.types';

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => userApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
