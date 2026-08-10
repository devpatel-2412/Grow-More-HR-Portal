import type { Request, Response } from 'express';
import { regularizationService } from './regularization.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { resolveEffectivePermissions } from '../../shared/permissions/permission-resolver.service.js';
import type { z } from 'zod';
import type { requestRegularizationSchema, listRegularizationsQuerySchema, reviewRegularizationSchema } from './attendance.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function requestRegularization(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof requestRegularizationSchema>;
  const record = await regularizationService.request(req.user!.sub, req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, record);
}

export async function listRegularizations(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listRegularizationsQuerySchema>;
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canReadTenant = effective.has(PERMISSIONS.ATTENDANCE_REGULARIZATION_APPROVE);
  const { rows, meta } = await regularizationService.list(req.user!.tenantId, { userId: req.user!.sub, canReadTenant }, query);
  sendPaginated(res, rows, meta);
}

export async function reviewRegularization(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof reviewRegularizationSchema>;
  const record = await regularizationService.review(req.user!.tenantId, req.params.id, body.status, requestMeta(req));
  sendOk(res, record);
}
