import type { Request, Response } from 'express';
import { sopService } from './sop.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createSopSchema, updateSopSchema, listSopsQuerySchema } from './sop.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createSop(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createSopSchema>;
  sendCreated(res, await sopService.create(req.user!.tenantId, body, requestMeta(req)));
}

export async function getSop(req: Request, res: Response): Promise<void> {
  sendOk(res, await sopService.requireSop(req.user!.tenantId, req.params.id));
}

export async function updateSop(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateSopSchema>;
  sendOk(res, await sopService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function publishSop(req: Request, res: Response): Promise<void> {
  sendOk(res, await sopService.publish(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function archiveSop(req: Request, res: Response): Promise<void> {
  sendOk(res, await sopService.archive(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function deleteSop(req: Request, res: Response): Promise<void> {
  await sopService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listSops(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listSopsQuerySchema>;
  const { rows, meta } = await sopService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function listSopRevisions(req: Request, res: Response): Promise<void> {
  sendOk(res, await sopService.listRevisions(req.user!.tenantId, req.params.id));
}
