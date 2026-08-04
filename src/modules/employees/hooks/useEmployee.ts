import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '../api/employee.api';

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', 'detail', id],
    queryFn: () => employeeApi.get(id!),
    enabled: !!id,
  });
}
