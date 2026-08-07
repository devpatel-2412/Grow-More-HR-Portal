import type { Request, Response } from 'express';
import { rbacService, type RbacRequestContext } from './rbac.service.js';
import { sendCreated, sendOk, sendNoContent } from '../../shared/utils/response.util.js';
import { ALL_PERMISSIONS, type Permission } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type {
  createRoleSchema,
  updateRoleSchema,
  duplicateRoleSchema,
  assignPermissionSchema,
  createDepartmentPermissionSchema,
  createBranchPermissionSchema,
  assignUserRoleSchema,
} from './rbac.validators.js';

function requestContext(req: Request): RbacRequestContext {
  return {
    actorUserId: req.user!.sub,
    actorRole: req.user!.role,
    tenantId: req.user!.tenantId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

/** The full assignable-permission catalogue, for the frontend's permission matrix — a single
 * source of truth (PERMISSIONS in permissions.ts) rather than a duplicated client-side list that
 * could drift out of sync. */
export async function listPermissionCatalogue(_req: Request, res: Response): Promise<void> {
  sendOk(res, ALL_PERMISSIONS);
}

export async function listRoles(req: Request, res: Response): Promise<void> {
  const roles = await rbacService.listRoles(req.user!.tenantId);
  sendOk(res, roles);
}

export async function getRole(req: Request, res: Response): Promise<void> {
  const role = await rbacService.getRole(req.user!.tenantId, req.params.id);
  sendOk(res, role);
}

export async function createRole(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createRoleSchema>;
  const role = await rbacService.createRole(requestContext(req), body);
  sendCreated(res, role);
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateRoleSchema>;
  const role = await rbacService.updateRole(requestContext(req), req.params.id, body);
  sendOk(res, role);
}

export async function deleteRole(req: Request, res: Response): Promise<void> {
  await rbacService.deleteRole(requestContext(req), req.params.id);
  sendNoContent(res);
}

export async function duplicateRole(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof duplicateRoleSchema>;
  const role = await rbacService.duplicateRole(requestContext(req), req.params.id, body.name);
  sendCreated(res, role);
}

export async function assignPermission(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof assignPermissionSchema>;
  await rbacService.assignPermission(requestContext(req), req.params.id, body.permission);
  sendNoContent(res);
}

export async function removePermission(req: Request, res: Response): Promise<void> {
  await rbacService.removePermission(requestContext(req), req.params.id, req.params.permission);
  sendNoContent(res);
}

export async function listDepartmentPermissions(req: Request, res: Response): Promise<void> {
  const rows = await rbacService.listDepartmentPermissions(req.user!.tenantId);
  sendOk(res, rows);
}

export async function createDepartmentPermission(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createDepartmentPermissionSchema>;
  const row = await rbacService.createDepartmentPermission(requestContext(req), body.department, body.permission);
  sendCreated(res, row);
}

export async function deleteDepartmentPermission(req: Request, res: Response): Promise<void> {
  await rbacService.deleteDepartmentPermission(requestContext(req), req.params.id);
  sendNoContent(res);
}

export async function listBranchPermissions(req: Request, res: Response): Promise<void> {
  const rows = await rbacService.listBranchPermissions(req.user!.tenantId);
  sendOk(res, rows);
}

export async function createBranchPermission(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createBranchPermissionSchema>;
  const row = await rbacService.createBranchPermission(requestContext(req), body.branchId, body.permission as Permission);
  sendCreated(res, row);
}

export async function deleteBranchPermission(req: Request, res: Response): Promise<void> {
  await rbacService.deleteBranchPermission(requestContext(req), req.params.id);
  sendNoContent(res);
}

export async function listUserRoles(req: Request, res: Response): Promise<void> {
  const rows = await rbacService.listUserRoles(req.user!.tenantId, req.params.userId);
  sendOk(res, rows);
}

export async function assignUserRole(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof assignUserRoleSchema>;
  const assignment = await rbacService.assignRoleToUser(requestContext(req), req.params.userId, body.roleId);
  sendCreated(res, assignment);
}

export async function removeUserRole(req: Request, res: Response): Promise<void> {
  await rbacService.removeRoleFromUser(requestContext(req), req.params.userId, req.params.roleId);
  sendNoContent(res);
}
