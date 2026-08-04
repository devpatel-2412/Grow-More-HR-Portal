import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee.api';
import type { UpdateEmployeeFormValues } from '../schemas/employee.schemas';

type UpdateEmployeePayload = Omit<Partial<UpdateEmployeeFormValues>, 'branchId' | 'teamId'> & {
  branchId?: string | null;
  teamId?: string | null;
};

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateEmployeePayload }) => employeeApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
