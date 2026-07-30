import { useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employee.api';
import type { CreateEmployeeFormValues } from '../schemas/employee.schemas';

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateEmployeeFormValues) => employeeApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
