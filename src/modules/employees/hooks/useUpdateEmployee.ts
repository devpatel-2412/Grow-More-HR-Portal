import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee.api';
import type { UpdateEmployeeFormValues } from '../schemas/employee.schemas';

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateEmployeeFormValues }) => employeeApi.update(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
