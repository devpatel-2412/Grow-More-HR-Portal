import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/user.api';

export function useInvitableRoles() {
  return useQuery({
    queryKey: ['invitable-roles'],
    queryFn: () => userApi.invitableRoles(),
  });
}
