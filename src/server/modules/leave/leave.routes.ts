import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { submitLeaveSchema, listLeaveQuerySchema, leaveIdParamSchema, reviewLeaveSchema } from './leave.validators.js';
import { submitLeave, cancelLeave, managerReview, hrReview, getLeave, listLeave, listApprovalQueue } from './leave.controller.js';

export const leaveRouter = Router();

leaveRouter.use(authenticateAccessToken);

leaveRouter.post('/', validate({ body: submitLeaveSchema }), asyncHandler(submitLeave));
leaveRouter.get('/approval-queue', validate({ query: listLeaveQuerySchema }), asyncHandler(listApprovalQueue));
leaveRouter.get('/', validate({ query: listLeaveQuerySchema }), asyncHandler(listLeave));

leaveRouter.post('/:id/cancel', validate({ params: leaveIdParamSchema }), asyncHandler(cancelLeave));
leaveRouter.patch(
  '/:id/manager-review',
  validate({ params: leaveIdParamSchema, body: reviewLeaveSchema }),
  asyncHandler(managerReview),
);
leaveRouter.patch(
  '/:id/hr-review',
  requirePermission(PERMISSIONS.LEAVE_APPROVE_HR),
  validate({ params: leaveIdParamSchema, body: reviewLeaveSchema }),
  asyncHandler(hrReview),
);

leaveRouter.get('/:id', validate({ params: leaveIdParamSchema }), asyncHandler(getLeave));
