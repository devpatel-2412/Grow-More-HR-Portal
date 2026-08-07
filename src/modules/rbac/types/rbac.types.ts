export interface RolePermissionRow {
  id: string;
  permission: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermissionRow[];
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  createdAt: string;
  role: Role;
}
