import { api } from '../../../shared/lib/api-client';
import type { Role, UserRoleAssignment } from '../types/rbac.types';

// No create/update/delete/duplicate here — the 6 roles are fixed and only SUPER_ADMIN may toggle
// a role's permissions (see permissions.ts and rbac.routes.ts).
export const rbacApi = {
  listPermissions: () => api.get<string[]>('/rbac/permissions'),
  listRoles: () => api.get<Role[]>('/rbac/roles'),
  getRole: (id: string) => api.get<Role>(`/rbac/roles/${id}`),
  assignPermission: (roleId: string, permission: string) => api.post<void>(`/rbac/roles/${roleId}/permissions`, { permission }),
  removePermission: (roleId: string, permission: string) =>
    api.delete<void>(`/rbac/roles/${roleId}/permissions/${encodeURIComponent(permission)}`),
  listUserRoles: (userId: string) => api.get<UserRoleAssignment[]>(`/rbac/users/${userId}/roles`),
  assignUserRole: (userId: string, roleId: string) => api.post<UserRoleAssignment>(`/rbac/users/${userId}/roles`, { roleId }),
  removeUserRole: (userId: string, roleId: string) => api.delete<void>(`/rbac/users/${userId}/roles/${roleId}`),
};
