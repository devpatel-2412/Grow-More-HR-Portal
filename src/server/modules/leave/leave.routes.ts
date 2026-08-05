import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { submitLeaveSchema, listLeaveQuerySchema, leaveIdParamSchema, reviewLeaveSchema } from './leave.validators.js';
import { submitLeave, cancelLeave, managerReview, hrReview, getLeave, listLeave, listApprovalQueue } from './leave.controller.js';

export const leaveRouter = Router();

leaveRouter.use(authenticateAccessToken);

const apply = requirePermission(PERMISSIONS.LEAVE_APPLY);
const read = requireAnyPermission(PERMISSIONS.LEAVE_READ_TENANT, PERMISSIONS.LEAVE_VIEW_SELF);
// Gate is deliberately loose — managerReview's real authorization is entirely in the service
// (org-chart ownership, i.e. `record.managerId === profile.id`, with LEAVE_APPROVE_HR only as an
// override for HR staff). LEAVE_APPROVE_MANAGER isn't even read by the controller; requiring it
// here would make the ownership path unreachable for a manager who doesn't also hold that role.
const approveManager = requireAnyPermission(PERMISSIONS.LEAVE_APPROVE_MANAGER, PERMISSIONS.LEAVE_APPLY);
const approveHr = requirePermission(PERMISSIONS.LEAVE_APPROVE_HR);

leaveRouter.post('/', apply, validate({ body: submitLeaveSchema }), asyncHandler(submitLeave));
leaveRouter.get(
  '/approval-queue',
  requireAnyPermission(PERMISSIONS.LEAVE_APPROVE_HR, PERMISSIONS.LEAVE_APPROVE_MANAGER, PERMISSIONS.LEAVE_APPLY),
  validate({ query: listLeaveQuerySchema }),
  asyncHandler(listApprovalQueue),
);
leaveRouter.get('/', read, validate({ query: listLeaveQuerySchema }), asyncHandler(listLeave));

leaveRouter.post('/:id/cancel', apply, validate({ params: leaveIdParamSchema }), asyncHandler(cancelLeave));
leaveRouter.patch(
  '/:id/manager-review',
  approveManager,
  validate({ params: leaveIdParamSchema, body: reviewLeaveSchema }),
  asyncHandler(managerReview),
);
leaveRouter.patch(
  '/:id/hr-review',
  approveHr,
  validate({ params: leaveIdParamSchema, body: reviewLeaveSchema }),
  asyncHandler(hrReview),
);

leaveRouter.get('/:id', read, validate({ params: leaveIdParamSchema }), asyncHandler(getLeave));
