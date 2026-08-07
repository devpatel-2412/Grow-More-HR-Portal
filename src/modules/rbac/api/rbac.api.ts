import { api } from '../../../shared/lib/api-client';
import type { Role, UserRoleAssignment } from '../types/rbac.types';

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

export const rbacApi = {
  listPermissions: () => api.get<string[]>('/rbac/permissions'),
  listRoles: () => api.get<Role[]>('/rbac/roles'),
  getRole: (id: string) => api.get<Role>(`/rbac/roles/${id}`),
  createRole: (values: CreateRoleInput) => api.post<Role>('/rbac/roles', values),
  updateRole: (id: string, values: UpdateRoleInput) => api.patch<Role>(`/rbac/roles/${id}`, values),
  deleteRole: (id: string) => api.delete<void>(`/rbac/roles/${id}`),
  duplicateRole: (id: string, name: string) => api.post<Role>(`/rbac/roles/${id}/duplicate`, { name }),
  assignPermission: (roleId: string, permission: string) => api.post<void>(`/rbac/roles/${roleId}/permissions`, { permission }),
  removePermission: (roleId: string, permission: string) =>
    api.delete<void>(`/rbac/roles/${roleId}/permissions/${encodeURIComponent(permission)}`),
  listUserRoles: (userId: string) => api.get<UserRoleAssignment[]>(`/rbac/users/${userId}/roles`),
  assignUserRole: (userId: string, roleId: string) => api.post<UserRoleAssignment>(`/rbac/users/${userId}/roles`, { roleId }),
  removeUserRole: (userId: string, roleId: string) => api.delete<void>(`/rbac/users/${userId}/roles/${roleId}`),
};
