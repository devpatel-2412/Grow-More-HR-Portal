import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createJobPostingSchema,
  updateJobPostingSchema,
  listJobPostingsQuerySchema,
  createCandidateSchema,
  updateCandidateSchema,
  changeCandidateStageSchema,
  listCandidatesQuerySchema,
  scheduleInterviewSchema,
  updateInterviewSchema,
  listInterviewsQuerySchema,
  idParamSchema,
} from './recruitment.validators.js';
import {
  createJobPosting,
  getJobPosting,
  updateJobPosting,
  deleteJobPosting,
  listJobPostings,
  createCandidate,
  getCandidate,
  updateCandidate,
  changeCandidateStage,
  deleteCandidate,
  listCandidates,
  scheduleInterview,
  updateInterview,
  cancelInterview,
  listInterviews,
} from './recruitment.controller.js';

const manage = requirePermission(PERMISSIONS.RECRUITMENT_MANAGE);
const read = requirePermission(PERMISSIONS.RECRUITMENT_READ);

export const jobPostingRouter = Router();
jobPostingRouter.use(authenticateAccessToken);
jobPostingRouter.post('/', manage, validate({ body: createJobPostingSchema }), asyncHandler(createJobPosting));
jobPostingRouter.get('/', read, validate({ query: listJobPostingsQuerySchema }), asyncHandler(listJobPostings));
jobPostingRouter.get('/:id', read, validate({ params: idParamSchema }), asyncHandler(getJobPosting));
jobPostingRouter.patch(
  '/:id',
  manage,
  validate({ params: idParamSchema, body: updateJobPostingSchema }),
  asyncHandler(updateJobPosting),
);
jobPostingRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteJobPosting));

export const candidateRouter = Router();
candidateRouter.use(authenticateAccessToken);
candidateRouter.post('/', manage, validate({ body: createCandidateSchema }), asyncHandler(createCandidate));
candidateRouter.get('/', read, validate({ query: listCandidatesQuerySchema }), asyncHandler(listCandidates));
candidateRouter.get('/:id', read, validate({ params: idParamSchema }), asyncHandler(getCandidate));
candidateRouter.patch(
  '/:id/stage',
  manage,
  validate({ params: idParamSchema, body: changeCandidateStageSchema }),
  asyncHandler(changeCandidateStage),
);
candidateRouter.patch(
  '/:id',
  manage,
  validate({ params: idParamSchema, body: updateCandidateSchema }),
  asyncHandler(updateCandidate),
);
candidateRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(deleteCandidate));

export const interviewRouter = Router();
interviewRouter.use(authenticateAccessToken);
interviewRouter.post('/', manage, validate({ body: scheduleInterviewSchema }), asyncHandler(scheduleInterview));
interviewRouter.get('/', read, validate({ query: listInterviewsQuerySchema }), asyncHandler(listInterviews));
interviewRouter.patch(
  '/:id',
  manage,
  validate({ params: idParamSchema, body: updateInterviewSchema }),
  asyncHandler(updateInterview),
);
interviewRouter.delete('/:id', manage, validate({ params: idParamSchema }), asyncHandler(cancelInterview));
