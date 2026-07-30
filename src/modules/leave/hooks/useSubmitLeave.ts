import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../api/leave.api';
import type { SubmitLeaveFormValues } from '../schemas/leave.schemas';

export function useSubmitLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SubmitLeaveFormValues) => leaveApi.submit(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}
