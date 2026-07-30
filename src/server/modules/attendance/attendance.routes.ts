import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  punchInSchema,
  listAttendanceQuerySchema,
  attendanceIdParamSchema,
  requestRegularizationSchema,
  listRegularizationsQuerySchema,
  reviewRegularizationSchema,
  regularizationIdParamSchema,
} from './attendance.validators.js';
import { punchIn, punchOut, startBreak, endBreak, getToday, getAttendance, listAttendance } from './attendance.controller.js';
import { requestRegularization, listRegularizations, reviewRegularization } from './regularization.controller.js';

export const attendanceRouter = Router();

attendanceRouter.use(authenticateAccessToken);

attendanceRouter.post('/punch-in', validate({ body: punchInSchema }), asyncHandler(punchIn));
attendanceRouter.post('/punch-out', asyncHandler(punchOut));
attendanceRouter.post('/break/start', asyncHandler(startBreak));
attendanceRouter.post('/break/end', asyncHandler(endBreak));
attendanceRouter.get('/today', asyncHandler(getToday));

attendanceRouter.post(
  '/regularization',
  validate({ body: requestRegularizationSchema }),
  asyncHandler(requestRegularization),
);
attendanceRouter.get(
  '/regularization',
  validate({ query: listRegularizationsQuerySchema }),
  asyncHandler(listRegularizations),
);
attendanceRouter.patch(
  '/regularization/:id',
  requirePermission(PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE),
  validate({ params: regularizationIdParamSchema, body: reviewRegularizationSchema }),
  asyncHandler(reviewRegularization),
);

attendanceRouter.get('/', validate({ query: listAttendanceQuerySchema }), asyncHandler(listAttendance));
attendanceRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.ATTENDANCE_READ_TENANT),
  validate({ params: attendanceIdParamSchema }),
  asyncHandler(getAttendance),
);
