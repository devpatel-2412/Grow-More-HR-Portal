import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '../api/rbac.api';

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['rbac', 'roles'] });
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
