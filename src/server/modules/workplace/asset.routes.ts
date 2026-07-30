import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { requirePermission } from '../../shared/middleware/rbac.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { createAssetSchema, assignAssetSchema, changeAssetStatusSchema, listAssetsQuerySchema, idParamSchema } from './asset.validators.js';
import { createAsset, getAsset, assignAsset, unassignAsset, changeAssetStatus, listAssets } from './asset.controller.js';

const manage = requirePermission(PERMISSIONS.ASSET_MANAGE);

export const assetRouter = Router();
assetRouter.use(authenticateAccessToken);

// list() itself narrows an unprivileged caller to their own assigned assets, so no permission gate here.
assetRouter.get('/', validate({ query: listAssetsQuerySchema }), asyncHandler(listAssets));
assetRouter.post('/', manage, validate({ body: createAssetSchema }), asyncHandler(createAsset));
assetRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(getAsset));
assetRouter.patch('/:id/assign', manage, validate({ params: idParamSchema, body: assignAssetSchema }), asyncHandler(assignAsset));
assetRouter.patch('/:id/unassign', manage, validate({ params: idParamSchema }), asyncHandler(unassignAsset));
assetRouter.patch(
  '/:id/status',
  manage,
  validate({ params: idParamSchema, body: changeAssetStatusSchema }),
  asyncHandler(changeAssetStatus),
);
