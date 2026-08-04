import type { Request, Response } from 'express';
import { fnfService } from './fnf.service.js';
import { sendCreated, sendOk } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { upsertFnfSettlementSchema, updateFnfStatusSchema } from './fnf.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function getFnfSettlement(req: Request, res: Response): Promise<void> {
  sendOk(res, await fnfService.get(req.user!.tenantId, req.params.id));
}

export async function createFnfSettlement(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof upsertFnfSettlementSchema>;
  sendCreated(res, await fnfService.create(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function updateFnfSettlement(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof upsertFnfSettlementSchema>;
  sendOk(res, await fnfService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function changeFnfStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateFnfStatusSchema>;
  sendOk(res, await fnfService.changeStatus(req.user!.tenantId, req.params.id, body.status, requestMeta(req)));
}
