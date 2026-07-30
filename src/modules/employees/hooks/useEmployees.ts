import { useQuery } from '@tanstack/react-query';
import { employeeApi, type ListEmployeesQuery } from '../api/employee.api';

export function useEmployees(query: ListEmployeesQuery) {
  return useQuery({
    queryKey: ['employees', query],
    queryFn: () => employeeApi.list(query),
    placeholderData: (previous) => previous,
  });
}
