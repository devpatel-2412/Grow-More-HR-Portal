import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createSopSchema, updateSopSchema, listSopsQuerySchema, sopIdParamSchema } from './sop.validators.js';
import { createSop, getSop, updateSop, publishSop, archiveSop, deleteSop, listSops, listSopRevisions } from './sop.controller.js';

const manage = requirePermission(PERMISSIONS.SOP_MANAGE);

export const sopRouter = Router();
sopRouter.use(authenticateAccessToken);
sopRouter.use(requireStaff); // internal procedure library — never visible to a CLIENT portal login

// SOPs are visible to every tenant member, not just managers — only mutations are gated.
sopRouter.get('/', validate({ query: listSopsQuerySchema }), asyncHandler(listSops));
sopRouter.post('/', manage, validate({ body: createSopSchema }), asyncHandler(createSop));
sopRouter.get('/:id', validate({ params: sopIdParamSchema }), asyncHandler(getSop));
sopRouter.patch('/:id', manage, validate({ params: sopIdParamSchema, body: updateSopSchema }), asyncHandler(updateSop));
sopRouter.delete('/:id', manage, validate({ params: sopIdParamSchema }), asyncHandler(deleteSop));
sopRouter.post('/:id/publish', manage, validate({ params: sopIdParamSchema }), asyncHandler(publishSop));
sopRouter.post('/:id/archive', manage, validate({ params: sopIdParamSchema }), asyncHandler(archiveSop));
sopRouter.get('/:id/revisions', validate({ params: sopIdParamSchema }), asyncHandler(listSopRevisions));
