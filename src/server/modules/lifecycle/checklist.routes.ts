import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { updateChecklistItemSchema, checklistItemIdParamSchema } from './checklist.validators.js';
import { updateChecklistItem, deleteChecklistItem } from './checklist.controller.js';

const manage = requirePermission(PERMISSIONS.EMPLOYEE_UPDATE);

export const checklistItemRouter = Router();
checklistItemRouter.use(authenticateAccessToken);

checklistItemRouter.patch(
  '/:itemId',
  manage,
  validate({ params: checklistItemIdParamSchema, body: updateChecklistItemSchema }),
  asyncHandler(updateChecklistItem),
);
checklistItemRouter.delete('/:itemId', manage, validate({ params: checklistItemIdParamSchema }), asyncHandler(deleteChecklistItem));
