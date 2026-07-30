import { useQuery } from '@tanstack/react-query';
import { leaveApi, type ListLeaveQuery } from '../api/leave.api';

export function useMyLeave(query: ListLeaveQuery) {
  return useQuery({
    queryKey: ['leave', 'mine', query],
    queryFn: () => leaveApi.list(query),
    placeholderData: (previous) => previous,
  });
}
