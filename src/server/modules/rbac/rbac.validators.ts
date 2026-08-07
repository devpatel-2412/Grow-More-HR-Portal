import { z } from 'zod';
import { PERMISSIONS, type Permission } from '../../shared/permissions/permissions.js';

const permissionValues = Object.values(PERMISSIONS) as [Permission, ...Permission[]];
/** Only recognized permission strings are ever assignable — catches typos at the boundary rather
 * than silently storing a permission string nothing ever checks for. */
export const permissionSchema = z.enum(permissionValues);

export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(permissionSchema).optional().default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const duplicateRoleSchema = z.object({
  name: z.string().min(1).max(100),
});

export const assignPermissionSchema = z.object({
  permission: permissionSchema,
});

export const roleIdParamSchema = z.object({ id: z.string().uuid() });
export const roleAndPermissionParamSchema = z.object({ id: z.string().uuid(), permission: z.string().min(1) });

export const createDepartmentPermissionSchema = z.object({
  department: z.string().min(1).max(100),
  permission: permissionSchema,
});
export const departmentPermissionIdParamSchema = z.object({ id: z.string().uuid() });

export const createBranchPermissionSchema = z.object({
  branchId: z.string().uuid(),
  permission: permissionSchema,
});
export const branchPermissionIdParamSchema = z.object({ id: z.string().uuid() });

export const userIdParamSchema = z.object({ userId: z.string().uuid() });
export const userRoleParamSchema = z.object({ userId: z.string().uuid(), roleId: z.string().uuid() });
export const assignUserRoleSchema = z.object({ roleId: z.string().uuid() });
