import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { getAdminSummary } from './dashboard.controller.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/admin-summary',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.DASHBOARD_READ_TENANT),
  asyncHandler(getAdminSummary),
);
