import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  milestoneIdParamSchema,
} from './project.validators.js';
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
  createMilestone,
  listMilestones,
  updateMilestone,
  deleteMilestone,
} from './project.controller.js';

export const projectRouter = Router();
projectRouter.use(authenticateAccessToken);
projectRouter.use(requireStaff); // tenant-wide project list — a CLIENT only ever sees their own via /client-portal/projects

projectRouter.post('/', requirePermission(PERMISSIONS.PROJECT_MANAGE), validate({ body: createProjectSchema }), asyncHandler(createProject));
projectRouter.get('/', validate({ query: listProjectsQuerySchema }), asyncHandler(listProjects));
projectRouter.get('/:id', validate({ params: projectIdParamSchema }), asyncHandler(getProject));
projectRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_MANAGE),
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  asyncHandler(updateProject),
);
projectRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_MANAGE),
  validate({ params: projectIdParamSchema }),
  asyncHandler(deleteProject),
);

projectRouter.post(
  '/:projectId/milestones',
  requirePermission(PERMISSIONS.PROJECT_MANAGE),
  validate({ body: createMilestoneSchema }),
  asyncHandler(createMilestone),
);
projectRouter.get('/:projectId/milestones', asyncHandler(listMilestones));

export const milestoneRouter = Router();
milestoneRouter.use(authenticateAccessToken);
milestoneRouter.use(requireStaff);

milestoneRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_MANAGE),
  validate({ params: milestoneIdParamSchema, body: updateMilestoneSchema }),
  asyncHandler(updateMilestone),
);
milestoneRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PROJECT_MANAGE),
  validate({ params: milestoneIdParamSchema }),
  asyncHandler(deleteMilestone),
);
