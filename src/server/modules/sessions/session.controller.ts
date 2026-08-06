import type { Request, Response } from 'express';
import { sessionService } from './session.service.js';
import { sendOk } from '../../shared/utils/response.util.js';

function actorContext(req: Request) {
  return { actorUserId: req.user!.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function listActiveSessions(req: Request, res: Response): Promise<void> {
  const sessions = await sessionService.listActiveSessions(req.user!.tenantId);
  sendOk(res, sessions);
}

export async function forceLogoutUser(req: Request, res: Response): Promise<void> {
  await sessionService.forceLogoutUser(req.user!.tenantId, req.params.userId, actorContext(req));
  res.status(204).send();
}

export async function forceLogoutAll(req: Request, res: Response): Promise<void> {
  await sessionService.forceLogoutAll(req.user!.tenantId, actorContext(req));
  res.status(204).send();
}
