import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../api/leave.api';

export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}
