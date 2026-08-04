import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createTeamSchema, updateTeamSchema, listTeamsQuerySchema, teamIdParamSchema } from './team.validators.js';
import { createTeam, getTeam, updateTeam, deleteTeam, listTeams } from './team.controller.js';

const manage = requirePermission(PERMISSIONS.ORG_MANAGE);

export const teamRouter = Router();
teamRouter.use(authenticateAccessToken);
teamRouter.use(requireStaff); // internal org structure — never visible to a CLIENT portal login

teamRouter.get('/', validate({ query: listTeamsQuerySchema }), asyncHandler(listTeams));
teamRouter.post('/', manage, validate({ body: createTeamSchema }), asyncHandler(createTeam));
teamRouter.get('/:id', validate({ params: teamIdParamSchema }), asyncHandler(getTeam));
teamRouter.patch(
  '/:id',
  manage,
  validate({ params: teamIdParamSchema, body: updateTeamSchema }),
  asyncHandler(updateTeam),
);
teamRouter.delete('/:id', manage, validate({ params: teamIdParamSchema }), asyncHandler(deleteTeam));
