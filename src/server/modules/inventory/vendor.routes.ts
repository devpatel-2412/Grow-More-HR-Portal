import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createVendorSchema, updateVendorSchema, listVendorsQuerySchema, vendorIdParamSchema } from './vendor.validators.js';
import { createVendor, getVendor, updateVendor, deleteVendor, listVendors } from './vendor.controller.js';

const manage = requirePermission(PERMISSIONS.VENDOR_MANAGE);

export const vendorRouter = Router();
vendorRouter.use(authenticateAccessToken);
vendorRouter.use(requireStaff); // supplier records — never visible to a CLIENT portal login

// Vendors are visible to every tenant member, not just managers — only mutations are gated.
vendorRouter.get('/', validate({ query: listVendorsQuerySchema }), asyncHandler(listVendors));
vendorRouter.post('/', manage, validate({ body: createVendorSchema }), asyncHandler(createVendor));
vendorRouter.get('/:id', validate({ params: vendorIdParamSchema }), asyncHandler(getVendor));
vendorRouter.patch(
  '/:id',
  manage,
  validate({ params: vendorIdParamSchema, body: updateVendorSchema }),
  asyncHandler(updateVendor),
);
vendorRouter.delete('/:id', manage, validate({ params: vendorIdParamSchema }), asyncHandler(deleteVendor));
