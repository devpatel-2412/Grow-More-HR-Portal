import type { Request, Response } from 'express';
import { timeLogService } from './timelog.service.js';
import { sendCreated, sendOk, sendNoContent, sendPaginated } from '../../shared/utils/response.util.js';
import { roleHasPermission, PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type { startTimerSchema, stopTimerSchema, manualTimeLogSchema, listTimeLogQuerySchema } from './timelog.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function canReadTenant(req: Request) {
  return roleHasPermission(req.user!.role, PERMISSIONS.TIME_LOG_READ_TENANT);
}

export async function startTimer(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof startTimerSchema>;
  const record = await timeLogService.startTimer(req.user!.sub, req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, record);
}

export async function stopTimer(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof stopTimerSchema>;
  const record = await timeLogService.stopTimer(req.user!.sub, req.user!.tenantId, body.description, requestMeta(req));
  sendOk(res, record);
}

export async function getRunningTimer(req: Request, res: Response): Promise<void> {
  const record = await timeLogService.getRunning(req.user!.sub);
  sendOk(res, record);
}

export async function createManualLog(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof manualTimeLogSchema>;
  const record = await timeLogService.logManual(req.user!.sub, req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, record);
}

export async function deleteTimeLog(req: Request, res: Response): Promise<void> {
  await timeLogService.delete(req.user!.sub, req.user!.tenantId, req.params.id, canReadTenant(req), requestMeta(req));
  sendNoContent(res);
}

export async function listTimeLogs(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTimeLogQuerySchema>;
  const { rows, meta } = await timeLogService.list(req.user!.tenantId, { userId: req.user!.sub, canReadTenant: canReadTenant(req) }, query);
  sendPaginated(res, rows, meta);
}

export async function getTimeSummary(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTimeLogQuerySchema>;
  const summary = await timeLogService.summary(req.user!.tenantId, { userId: req.user!.sub, canReadTenant: canReadTenant(req) }, query);
  sendOk(res, summary);
}
