import { useQuery } from '@tanstack/react-query';
import { userApi, type ListUsersQuery } from '../api/user.api';

export function useUsers(query: ListUsersQuery) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => userApi.list(query),
    placeholderData: (previous) => previous,
  });
}
