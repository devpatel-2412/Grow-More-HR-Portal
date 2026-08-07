import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createRoleSchema,
  updateRoleSchema,
  duplicateRoleSchema,
  assignPermissionSchema,
  roleIdParamSchema,
  roleAndPermissionParamSchema,
  createDepartmentPermissionSchema,
  departmentPermissionIdParamSchema,
  createBranchPermissionSchema,
  branchPermissionIdParamSchema,
  userIdParamSchema,
  userRoleParamSchema,
  assignUserRoleSchema,
} from './rbac.validators.js';
import {
  listPermissionCatalogue,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  duplicateRole,
  assignPermission,
  removePermission,
  listDepartmentPermissions,
  createDepartmentPermission,
  deleteDepartmentPermission,
  listBranchPermissions,
  createBranchPermission,
  deleteBranchPermission,
  listUserRoles,
  assignUserRole,
  removeUserRole,
} from './rbac.controller.js';

export const rbacRouter = Router();

rbacRouter.use(authenticateAccessToken);
rbacRouter.use(requirePermission(PERMISSIONS.ROLE_MANAGE));

rbacRouter.get('/permissions', asyncHandler(listPermissionCatalogue));

rbacRouter.get('/roles', asyncHandler(listRoles));
rbacRouter.post('/roles', validate({ body: createRoleSchema }), asyncHandler(createRole));
rbacRouter.get('/roles/:id', validate({ params: roleIdParamSchema }), asyncHandler(getRole));
rbacRouter.patch('/roles/:id', validate({ params: roleIdParamSchema, body: updateRoleSchema }), asyncHandler(updateRole));
rbacRouter.delete('/roles/:id', validate({ params: roleIdParamSchema }), asyncHandler(deleteRole));
rbacRouter.post(
  '/roles/:id/duplicate',
  validate({ params: roleIdParamSchema, body: duplicateRoleSchema }),
  asyncHandler(duplicateRole),
);
rbacRouter.post(
  '/roles/:id/permissions',
  validate({ params: roleIdParamSchema, body: assignPermissionSchema }),
  asyncHandler(assignPermission),
);
rbacRouter.delete(
  '/roles/:id/permissions/:permission',
  validate({ params: roleAndPermissionParamSchema }),
  asyncHandler(removePermission),
);

rbacRouter.get('/department-permissions', asyncHandler(listDepartmentPermissions));
rbacRouter.post(
  '/department-permissions',
  validate({ body: createDepartmentPermissionSchema }),
  asyncHandler(createDepartmentPermission),
);
rbacRouter.delete(
  '/department-permissions/:id',
  validate({ params: departmentPermissionIdParamSchema }),
  asyncHandler(deleteDepartmentPermission),
);

rbacRouter.get('/branch-permissions', asyncHandler(listBranchPermissions));
rbacRouter.post('/branch-permissions', validate({ body: createBranchPermissionSchema }), asyncHandler(createBranchPermission));
rbacRouter.delete(
  '/branch-permissions/:id',
  validate({ params: branchPermissionIdParamSchema }),
  asyncHandler(deleteBranchPermission),
);

rbacRouter.get('/users/:userId/roles', validate({ params: userIdParamSchema }), asyncHandler(listUserRoles));
rbacRouter.post(
  '/users/:userId/roles',
  validate({ params: userIdParamSchema, body: assignUserRoleSchema }),
  asyncHandler(assignUserRole),
);
rbacRouter.delete('/users/:userId/roles/:roleId', validate({ params: userRoleParamSchema }), asyncHandler(removeUserRole));
