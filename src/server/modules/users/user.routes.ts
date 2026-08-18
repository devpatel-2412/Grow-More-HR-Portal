import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { avatarUploadSingle } from '../../shared/middleware/avatar-upload.middleware.js';
import {
  inviteUserSchema,
  acceptInviteSchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  inviteIdParamSchema,
} from './user.validators.js';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';
import {
  inviteUser,
  acceptInvite,
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  getInvitableRoles,
  listInvites,
  resendInvite,
  revokeInvite,
  uploadUserAvatar,
  removeUserAvatar,
} from './user.controller.js';

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

// The caller's own allowed invite-target roles — drives the invite dialog's role dropdown.
userRouter.get('/invitable-roles', requirePermission(PERMISSIONS.USER_INVITE), asyncHandler(getInvitableRoles));

// Invitation history + lifecycle actions. Registered ahead of GET /:id so "/invites" itself
// isn't swallowed by that param route.
userRouter.get(
  '/invites',
  requirePermission(PERMISSIONS.USER_INVITE),
  validate({ query: paginationQuerySchema }),
  asyncHandler(listInvites),
);
userRouter.post(
  '/invites/:id/resend',
  requirePermission(PERMISSIONS.USER_INVITE),
  validate({ params: inviteIdParamSchema }),
  asyncHandler(resendInvite),
);
userRouter.post(
  '/invites/:id/revoke',
  requirePermission(PERMISSIONS.USER_INVITE),
  validate({ params: inviteIdParamSchema }),
  asyncHandler(revokeInvite),
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

// Admin-manages-another-user's-avatar — reuses USER_STATUS_UPDATE (ADMIN/SUPER_ADMIN only, same as
// the role/status routes above) rather than introducing a new permission for one narrow action.
userRouter.post(
  '/:id/avatar',
  requirePermission(PERMISSIONS.USER_STATUS_UPDATE),
  validate({ params: userIdParamSchema }),
  avatarUploadSingle,
  asyncHandler(uploadUserAvatar),
);
userRouter.delete(
  '/:id/avatar',
  requirePermission(PERMISSIONS.USER_STATUS_UPDATE),
  validate({ params: userIdParamSchema }),
  asyncHandler(removeUserAvatar),
);
