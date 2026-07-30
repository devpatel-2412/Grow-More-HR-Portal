import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  inviteUserSchema,
  acceptInviteSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './user.validators.js';
import { inviteUser, acceptInvite, listUsers, getUser, updateUserRole, updateUserStatus } from './user.controller.js';

export const userRouter = Router();

// Public: the caller does not hold a session yet — they are redeeming an invite token.
userRouter.post('/invite/accept', validate({ body: acceptInviteSchema }), asyncHandler(acceptInvite));

userRouter.use(authenticateAccessToken);

userRouter.post(
  '/invite',
  requirePermission(PERMISSIONS.USER_INVITE),
  validate({ body: inviteUserSchema }),
  asyncHandler(inviteUser),
);

userRouter.get(
  '/',
  requirePermission(PERMISSIONS.USER_READ_TENANT),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(listUsers),
);

userRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.USER_READ_TENANT),
  validate({ params: userIdParamSchema }),
  asyncHandler(getUser),
);

userRouter.patch(
  '/:id/role',
  requirePermission(PERMISSIONS.USER_ROLE_UPDATE),
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  asyncHandler(updateUserRole),
);

userRouter.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.USER_STATUS_UPDATE),
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  asyncHandler(updateUserStatus),
);
