import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '../api/rbac.api';

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['rbac', 'roles'] });
    // Also invalidate the acting user's own session query — if a SUPER_ADMIN edits their own
    // effective role (e.g. testing HR_MANAGER permissions from an assigned second role), their
    // permission-gated UI should refresh on the existing session-refresh mechanism, not require a
    // hard reload. Other already-logged-in users of the edited role pick this up on their own
    // AuthContext's next background refetch (see AuthContext.tsx) or next login.
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };
}

export function useAssignPermission() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ roleId, permission }: { roleId: string; permission: string }) => rbacApi.assignPermission(roleId, permission),
    onSuccess: invalidate,
  });
}

export function useRemovePermission() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ roleId, permission }: { roleId: string; permission: string }) => rbacApi.removePermission(roleId, permission),
    onSuccess: invalidate,
  });
}
