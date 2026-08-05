import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../shared/middleware/rbac.middleware.js';
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

const self = requirePermission(PERMISSIONS.ATTENDANCE_SELF);
const read = requireAnyPermission(PERMISSIONS.ATTENDANCE_READ_TENANT, PERMISSIONS.ATTENDANCE_SELF);

attendanceRouter.post('/punch-in', self, validate({ body: punchInSchema }), asyncHandler(punchIn));
attendanceRouter.post('/punch-out', self, asyncHandler(punchOut));
attendanceRouter.post('/break/start', self, asyncHandler(startBreak));
attendanceRouter.post('/break/end', self, asyncHandler(endBreak));
attendanceRouter.get('/today', self, asyncHandler(getToday));

attendanceRouter.post(
  '/regularization',
  requirePermission(PERMISSIONS.ATTENDANCE_REGULARIZATION_CREATE),
  validate({ body: requestRegularizationSchema }),
  asyncHandler(requestRegularization),
);
attendanceRouter.get(
  '/regularization',
  read,
  validate({ query: listRegularizationsQuerySchema }),
  asyncHandler(listRegularizations),
);
attendanceRouter.patch(
  '/regularization/:id',
  requirePermission(PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE),
  validate({ params: regularizationIdParamSchema, body: reviewRegularizationSchema }),
  asyncHandler(reviewRegularization),
);

attendanceRouter.get('/', read, validate({ query: listAttendanceQuerySchema }), asyncHandler(listAttendance));
attendanceRouter.get(
  '/:id',
  read,
  validate({ params: attendanceIdParamSchema }),
  asyncHandler(getAttendance),
);
