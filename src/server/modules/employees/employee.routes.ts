import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createEmployeeProfileSchema,
  updateEmployeeProfileSchema,
  listEmployeesQuerySchema,
  employeeIdParamSchema,
} from './employee.validators.js';
import { createEmployee, getEmployee, getMyEmployeeProfile, updateEmployee, listEmployees } from './employee.controller.js';
import { createChecklistItemSchema } from '../lifecycle/checklist.validators.js';
import { listChecklist, createChecklistItem } from '../lifecycle/checklist.controller.js';
import {
  confirmEmployeeSchema,
  promoteEmployeeSchema,
  transferEmployeeSchema,
  initiateExitSchema,
  completeExitSchema,
} from '../lifecycle/lifecycle.validators.js';
import {
  listLifecycleEvents,
  confirmEmployee,
  promoteEmployee,
  transferEmployee,
  initiateEmployeeExit,
  completeEmployeeExit,
} from '../lifecycle/lifecycle.controller.js';
import { upsertFnfSettlementSchema, updateFnfStatusSchema } from '../lifecycle/fnf.validators.js';
import { getFnfSettlement, createFnfSettlement, updateFnfSettlement, changeFnfStatus } from '../lifecycle/fnf.controller.js';

export const employeeRouter = Router();

employeeRouter.use(authenticateAccessToken);

// Specific path before the ":id" param route so "me" is never captured as an id.
employeeRouter.get('/me', asyncHandler(getMyEmployeeProfile));

employeeRouter.post(
  '/',
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  validate({ body: createEmployeeProfileSchema }),
  asyncHandler(createEmployee),
);

employeeRouter.get(
  '/',
  requirePermission(PERMISSIONS.EMPLOYEE_READ_TENANT),
  validate({ query: listEmployeesQuerySchema }),
  asyncHandler(listEmployees),
);

employeeRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.EMPLOYEE_READ_TENANT),
  validate({ params: employeeIdParamSchema }),
  asyncHandler(getEmployee),
);

employeeRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: updateEmployeeProfileSchema }),
  asyncHandler(updateEmployee),
);

// Onboarding checklist — reading is ownership-checked in the service (own checklist, or EMPLOYEE_UPDATE for anyone's).
employeeRouter.get('/:id/checklist', validate({ params: employeeIdParamSchema }), asyncHandler(listChecklist));
employeeRouter.post(
  '/:id/checklist',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: createChecklistItemSchema }),
  asyncHandler(createChecklistItem),
);

// Lifecycle events
employeeRouter.get(
  '/:id/lifecycle-events',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema }),
  asyncHandler(listLifecycleEvents),
);
employeeRouter.post(
  '/:id/confirm',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: confirmEmployeeSchema }),
  asyncHandler(confirmEmployee),
);
employeeRouter.post(
  '/:id/promote',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: promoteEmployeeSchema }),
  asyncHandler(promoteEmployee),
);
employeeRouter.post(
  '/:id/transfer',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: transferEmployeeSchema }),
  asyncHandler(transferEmployee),
);
employeeRouter.post(
  '/:id/exit/initiate',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: initiateExitSchema }),
  asyncHandler(initiateEmployeeExit),
);
employeeRouter.post(
  '/:id/exit/complete',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: completeExitSchema }),
  asyncHandler(completeEmployeeExit),
);

// Full & final settlement
employeeRouter.get(
  '/:id/fnf-settlement',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema }),
  asyncHandler(getFnfSettlement),
);
employeeRouter.post(
  '/:id/fnf-settlement',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: upsertFnfSettlementSchema }),
  asyncHandler(createFnfSettlement),
);
employeeRouter.patch(
  '/:id/fnf-settlement',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: upsertFnfSettlementSchema }),
  asyncHandler(updateFnfSettlement),
);
employeeRouter.patch(
  '/:id/fnf-settlement/status',
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  validate({ params: employeeIdParamSchema, body: updateFnfStatusSchema }),
  asyncHandler(changeFnfStatus),
);
