import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '../api/session.api';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: sessionApi.list,
  });
}
