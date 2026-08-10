import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requireRole } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
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
// The 6 fixed roles' access is decided by SUPER_ADMIN alone — see permissions.ts's ROLE_PERMISSIONS
// doc comment and permission-resolver.service.ts. Not permission-gated: there is no permission that
// could delegate this without also being editable through this very page.
rbacRouter.use(requireRole('SUPER_ADMIN'));

rbacRouter.get('/permissions', asyncHandler(listPermissionCatalogue));

rbacRouter.get('/roles', asyncHandler(listRoles));
rbacRouter.get('/roles/:id', validate({ params: roleIdParamSchema }), asyncHandler(getRole));
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
