import type { Request, Response } from 'express';
import { vendorService } from './vendor.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createVendorSchema, updateVendorSchema, listVendorsQuerySchema } from './vendor.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createVendor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createVendorSchema>;
  sendCreated(res, await vendorService.create(req.user!.tenantId, body, requestMeta(req)));
}

export async function getVendor(req: Request, res: Response): Promise<void> {
  sendOk(res, await vendorService.requireVendor(req.user!.tenantId, req.params.id));
}

export async function updateVendor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateVendorSchema>;
  sendOk(res, await vendorService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteVendor(req: Request, res: Response): Promise<void> {
  await vendorService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listVendors(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listVendorsQuerySchema>;
  const { rows, meta } = await vendorService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
