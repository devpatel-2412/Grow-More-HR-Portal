import type { Request, Response } from 'express';
import { visitorService } from './visitor.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { registerVisitorSchema, listVisitorsQuerySchema } from './visitor.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function registerVisitor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof registerVisitorSchema>;
  sendCreated(res, await visitorService.register(req.user!.tenantId, body, requestMeta(req)));
}

export async function getVisitor(req: Request, res: Response): Promise<void> {
  sendOk(res, await visitorService.requireVisitor(req.user!.tenantId, req.params.id));
}

export async function checkInVisitor(req: Request, res: Response): Promise<void> {
  sendOk(res, await visitorService.checkIn(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function checkOutVisitor(req: Request, res: Response): Promise<void> {
  sendOk(res, await visitorService.checkOut(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function listVisitors(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listVisitorsQuerySchema>;
  const { rows, meta } = await visitorService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
