import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requireRole, requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createTenantSchema, updateTenantSchema, listTenantsQuerySchema, tenantIdParamSchema } from './tenant.validators.js';
import { createTenant, getTenant, updateTenant, listTenants } from './tenant.controller.js';

export const tenantRouter = Router();

// The only way a new company (and its first user) can ever come into existence — public
// registration is permanently closed. Creates the Tenant plus a PENDING_INVITE ADMIN who gets an
// activation email immediately (see TenantService.create()).
tenantRouter.post(
  '/',
  authenticateAccessToken,
  requireRole('SUPER_ADMIN'),
  validate({ body: createTenantSchema }),
  asyncHandler(createTenant),
);

tenantRouter.get(
  '/',
  authenticateAccessToken,
  requireRole('SUPER_ADMIN'),
  validate({ query: listTenantsQuerySchema }),
  asyncHandler(listTenants),
);

tenantRouter.get(
  '/:id',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.TENANT_READ),
  validate({ params: tenantIdParamSchema }),
  asyncHandler(getTenant),
);

tenantRouter.patch(
  '/:id',
  authenticateAccessToken,
  requirePermission(PERMISSIONS.TENANT_UPDATE),
  validate({ params: tenantIdParamSchema, body: updateTenantSchema }),
  asyncHandler(updateTenant),
);
