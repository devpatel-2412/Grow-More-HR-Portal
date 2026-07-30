import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  setSalaryStructureSchema,
  listSalaryStructuresQuerySchema,
  generatePayrollRunSchema,
  listPayrollRunsQuerySchema,
  listPayrollItemsQuerySchema,
  updatePayrollItemSchema,
  idParamSchema,
} from './payroll.validators.js';
import {
  setSalaryStructure,
  listSalaryStructures,
  generatePayrollRun,
  getPayrollRun,
  listPayrollRuns,
  approvePayrollRun,
  markPayrollRunPaid,
  cancelPayrollRun,
  updatePayrollItem,
  listPayslips,
} from './payroll.controller.js';

export const payrollRouter = Router();

payrollRouter.use(authenticateAccessToken);

// Every employee can read their own payslips; the service narrows the scope for anyone
// without PAYROLL_READ_TENANT.
payrollRouter.get('/payslips', validate({ query: listPayrollItemsQuerySchema }), asyncHandler(listPayslips));

payrollRouter.post(
  '/salary-structures',
  requirePermission(PERMISSIONS.PAYROLL_MANAGE),
  validate({ body: setSalaryStructureSchema }),
  asyncHandler(setSalaryStructure),
);
payrollRouter.get(
  '/salary-structures',
  requirePermission(PERMISSIONS.PAYROLL_READ_TENANT),
  validate({ query: listSalaryStructuresQuerySchema }),
  asyncHandler(listSalaryStructures),
);

payrollRouter.post(
  '/runs',
  requirePermission(PERMISSIONS.PAYROLL_MANAGE),
  validate({ body: generatePayrollRunSchema }),
  asyncHandler(generatePayrollRun),
);
payrollRouter.get(
  '/runs',
  requirePermission(PERMISSIONS.PAYROLL_READ_TENANT),
  validate({ query: listPayrollRunsQuerySchema }),
  asyncHandler(listPayrollRuns),
);
payrollRouter.get(
  '/runs/:id',
  requirePermission(PERMISSIONS.PAYROLL_READ_TENANT),
  validate({ params: idParamSchema }),
  asyncHandler(getPayrollRun),
);
payrollRouter.post(
  '/runs/:id/approve',
  requirePermission(PERMISSIONS.PAYROLL_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(approvePayrollRun),
);
payrollRouter.post(
  '/runs/:id/mark-paid',
  requirePermission(PERMISSIONS.PAYROLL_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(markPayrollRunPaid),
);
payrollRouter.post(
  '/runs/:id/cancel',
  requirePermission(PERMISSIONS.PAYROLL_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(cancelPayrollRun),
);

payrollRouter.patch(
  '/payslips/:id',
  requirePermission(PERMISSIONS.PAYROLL_MANAGE),
  validate({ params: idParamSchema, body: updatePayrollItemSchema }),
  asyncHandler(updatePayrollItem),
);
