import { useQuery } from '@tanstack/react-query';
import { userApi, type ListInvitesQuery } from '../api/user.api';

export function useInvites(query: ListInvitesQuery) {
  return useQuery({
    queryKey: ['invites', query],
    queryFn: () => userApi.listInvites(query),
    placeholderData: (previous) => previous,
  });
}
