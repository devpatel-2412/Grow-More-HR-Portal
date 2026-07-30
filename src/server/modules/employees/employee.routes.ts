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
