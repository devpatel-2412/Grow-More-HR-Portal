import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, type CreateRoleInput, type UpdateRoleInput } from '../api/rbac.api';

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['rbac', 'roles'] });
}

export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (values: CreateRoleInput) => rbacApi.createRole(values),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateRoleInput }) => rbacApi.updateRole(id, values),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: string) => rbacApi.deleteRole(id),
    onSuccess: invalidate,
  });
}

export function useDuplicateRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => rbacApi.duplicateRole(id, name),
    onSuccess: invalidate,
  });
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
