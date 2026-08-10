import type { Request, Response } from 'express';
import { leaveService } from './leave.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { resolveEffectivePermissions } from '../../shared/permissions/permission-resolver.service.js';
import type { z } from 'zod';
import type { submitLeaveSchema, listLeaveQuerySchema, reviewLeaveSchema } from './leave.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function submitLeave(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof submitLeaveSchema>;
  const record = await leaveService.submit(req.user!.sub, req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, record);
}

export async function cancelLeave(req: Request, res: Response): Promise<void> {
  const record = await leaveService.cancel(req.user!.sub, req.user!.tenantId, req.params.id, requestMeta(req));
  sendOk(res, record);
}

export async function managerReview(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof reviewLeaveSchema>;
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const hasOverride = effective.has(PERMISSIONS.LEAVE_APPROVE_HR);
  const record = await leaveService.managerReview(req.user!.sub, req.user!.tenantId, req.params.id, body.status, hasOverride, requestMeta(req));
  sendOk(res, record);
}

export async function hrReview(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof reviewLeaveSchema>;
  const record = await leaveService.hrReview(req.user!.sub, req.user!.tenantId, req.params.id, body.status, requestMeta(req));
  sendOk(res, record);
}

export async function getLeave(req: Request, res: Response): Promise<void> {
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canReadTenant = effective.has(PERMISSIONS.LEAVE_READ_TENANT);
  const record = await leaveService.getById(req.user!.tenantId, req.params.id, { userId: req.user!.sub, canReadTenant });
  sendOk(res, record);
}

export async function listLeave(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listLeaveQuerySchema>;
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canReadTenant = effective.has(PERMISSIONS.LEAVE_READ_TENANT);
  const { rows, meta } = await leaveService.list(req.user!.tenantId, { userId: req.user!.sub, canReadTenant }, query);
  sendPaginated(res, rows, meta);
}

export async function listApprovalQueue(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listLeaveQuerySchema>;
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canApproveHr = effective.has(PERMISSIONS.LEAVE_APPROVE_HR);
  const { rows, meta } = await leaveService.listApprovalQueue(req.user!.tenantId, req.user!.sub, canApproveHr, query.page, query.limit);
  sendPaginated(res, rows, meta);
}
