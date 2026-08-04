import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission, requireStaff } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createBranchSchema, updateBranchSchema, listBranchesQuerySchema, branchIdParamSchema } from './branch.validators.js';
import { createBranch, getBranch, updateBranch, deleteBranch, listBranches } from './branch.controller.js';

const manage = requirePermission(PERMISSIONS.ORG_MANAGE);

export const branchRouter = Router();
branchRouter.use(authenticateAccessToken);
branchRouter.use(requireStaff); // internal org structure — never visible to a CLIENT portal login

// Org structure is visible to every tenant member, not just managers — only mutations are gated.
branchRouter.get('/', validate({ query: listBranchesQuerySchema }), asyncHandler(listBranches));
branchRouter.post('/', manage, validate({ body: createBranchSchema }), asyncHandler(createBranch));
branchRouter.get('/:id', validate({ params: branchIdParamSchema }), asyncHandler(getBranch));
branchRouter.patch(
  '/:id',
  manage,
  validate({ params: branchIdParamSchema, body: updateBranchSchema }),
  asyncHandler(updateBranch),
);
branchRouter.delete('/:id', manage, validate({ params: branchIdParamSchema }), asyncHandler(deleteBranch));
