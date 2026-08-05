import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../../shared/middleware/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  submitWorkReportSchema,
  updateWorkReportSchema,
  reviewWorkReportSchema,
  listWorkReportQuerySchema,
  workReportIdParamSchema,
} from './workreport.validators.js';
import {
  submitWorkReport,
  updateWorkReport,
  reviewWorkReport,
  getWorkReport,
  listWorkReports,
  listReviewQueue,
} from './workreport.controller.js';

export const workReportRouter = Router();

workReportRouter.use(authenticateAccessToken);

const submit = requirePermission(PERMISSIONS.WORK_REPORT_SUBMIT);
const read = requireAnyPermission(PERMISSIONS.WORK_REPORT_READ_TENANT, PERMISSIONS.WORK_REPORT_SUBMIT);
// Gate is deliberately loose (anyone who can submit a report at all) — the same shape as `read`
// above. The controller/service already compute the real authorization: WORK_REPORT_REVIEW for
// tenant-wide access, or being the target employee's org-chart manager otherwise (see
// WorkReportService.review/listReviewQueue). A strict WORK_REPORT_REVIEW-only gate here would
// make that ownership fallback unreachable for a manager who doesn't also hold the role permission.
const review = requireAnyPermission(PERMISSIONS.WORK_REPORT_REVIEW, PERMISSIONS.WORK_REPORT_SUBMIT);

workReportRouter.post('/', submit, validate({ body: submitWorkReportSchema }), asyncHandler(submitWorkReport));
workReportRouter.get('/review-queue', review, validate({ query: listWorkReportQuerySchema }), asyncHandler(listReviewQueue));
workReportRouter.get('/', read, validate({ query: listWorkReportQuerySchema }), asyncHandler(listWorkReports));

workReportRouter.patch(
  '/:id/review',
  review,
  validate({ params: workReportIdParamSchema, body: reviewWorkReportSchema }),
  asyncHandler(reviewWorkReport),
);
workReportRouter.patch(
  '/:id',
  submit,
  validate({ params: workReportIdParamSchema, body: updateWorkReportSchema }),
  asyncHandler(updateWorkReport),
);
workReportRouter.get('/:id', read, validate({ params: workReportIdParamSchema }), asyncHandler(getWorkReport));
