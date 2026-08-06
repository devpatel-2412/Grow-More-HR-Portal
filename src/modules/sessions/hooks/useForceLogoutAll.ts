import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../api/session.api';

export function useForceLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sessionApi.forceLogoutAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
