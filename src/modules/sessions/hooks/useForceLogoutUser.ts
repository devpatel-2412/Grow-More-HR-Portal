import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../api/session.api';

export function useForceLogoutUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => sessionApi.forceLogoutUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
