import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
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

workReportRouter.post('/', validate({ body: submitWorkReportSchema }), asyncHandler(submitWorkReport));
workReportRouter.get('/review-queue', validate({ query: listWorkReportQuerySchema }), asyncHandler(listReviewQueue));
workReportRouter.get('/', validate({ query: listWorkReportQuerySchema }), asyncHandler(listWorkReports));

workReportRouter.patch(
  '/:id/review',
  validate({ params: workReportIdParamSchema, body: reviewWorkReportSchema }),
  asyncHandler(reviewWorkReport),
);
workReportRouter.patch(
  '/:id',
  validate({ params: workReportIdParamSchema, body: updateWorkReportSchema }),
  asyncHandler(updateWorkReport),
);
workReportRouter.get('/:id', validate({ params: workReportIdParamSchema }), asyncHandler(getWorkReport));
