import type { Request, Response } from 'express';
import { lifecycleService } from './lifecycle.service.js';
import { sendOk } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  confirmEmployeeSchema,
  promoteEmployeeSchema,
  transferEmployeeSchema,
  initiateExitSchema,
  completeExitSchema,
} from './lifecycle.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function listLifecycleEvents(req: Request, res: Response): Promise<void> {
  sendOk(res, await lifecycleService.listEvents(req.user!.tenantId, req.params.id));
}

export async function confirmEmployee(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof confirmEmployeeSchema>;
  sendOk(res, await lifecycleService.confirm(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function promoteEmployee(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof promoteEmployeeSchema>;
  sendOk(res, await lifecycleService.promote(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function transferEmployee(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof transferEmployeeSchema>;
  sendOk(res, await lifecycleService.transfer(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function initiateEmployeeExit(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof initiateExitSchema>;
  sendOk(res, await lifecycleService.initiateExit(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function completeEmployeeExit(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof completeExitSchema>;
  sendOk(res, await lifecycleService.completeExit(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}
