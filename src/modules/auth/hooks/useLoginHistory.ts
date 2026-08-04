import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export function useLoginHistory(query: { page: number; limit: number }) {
  return useQuery({
    queryKey: ['auth', 'login-history', query],
    queryFn: () => authApi.loginHistory(query),
    placeholderData: (previous) => previous,
  });
}
