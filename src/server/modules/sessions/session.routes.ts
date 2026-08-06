import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { forceLogoutUserParamSchema } from './session.validators.js';
import { listActiveSessions, forceLogoutUser, forceLogoutAll } from './session.controller.js';

export const sessionRouter = Router();

sessionRouter.get(
  '/',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.SESSION_MANAGE),
  asyncHandler(listActiveSessions),
);

sessionRouter.post(
  '/force-logout-all',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.SESSION_MANAGE),
  asyncHandler(forceLogoutAll),
);

sessionRouter.post(
  '/users/:userId/force-logout',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.SESSION_MANAGE),
  validate({ params: forceLogoutUserParamSchema }),
  asyncHandler(forceLogoutUser),
);
