import type { Request, Response } from 'express';
import { assetService } from './asset.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { roleHasPermission, PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type { createAssetSchema, assignAssetSchema, changeAssetStatusSchema, listAssetsQuerySchema } from './asset.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createAsset(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createAssetSchema>;
  sendCreated(res, await assetService.create(req.user!.tenantId, body, requestMeta(req)));
}

export async function getAsset(req: Request, res: Response): Promise<void> {
  sendOk(res, await assetService.requireAsset(req.user!.tenantId, req.params.id));
}

export async function assignAsset(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof assignAssetSchema>;
  sendOk(res, await assetService.assign(req.user!.tenantId, req.params.id, body.employeeId, requestMeta(req)));
}

export async function unassignAsset(req: Request, res: Response): Promise<void> {
  sendOk(res, await assetService.unassign(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function changeAssetStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof changeAssetStatusSchema>;
  sendOk(res, await assetService.changeStatus(req.user!.tenantId, req.params.id, body.status, requestMeta(req)));
}

export async function listAssets(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listAssetsQuerySchema>;
  const canReadTenant = roleHasPermission(req.user!.role, PERMISSIONS.ASSET_MANAGE);
  const { rows, meta } = await assetService.list(req.user!.tenantId, { userId: req.user!.sub, canReadTenant }, query);
  sendPaginated(res, rows, meta);
}
