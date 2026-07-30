import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { listAuditLogsQuerySchema } from './audit.validators.js';
import { listAuditLogs } from './audit.controller.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.AUDIT_READ),
  validate({ query: listAuditLogsQuerySchema }),
  asyncHandler(listAuditLogs),
);
