import type { Request, Response } from 'express';
import { workReportService } from './workreport.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { roleHasPermission, PERMISSIONS } from '../../shared/permissions/permissions.js';
import type { z } from 'zod';
import type {
  submitWorkReportSchema,
  updateWorkReportSchema,
  reviewWorkReportSchema,
  listWorkReportQuerySchema,
} from './workreport.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function submitWorkReport(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof submitWorkReportSchema>;
  const record = await workReportService.submit(req.user!.sub, req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, record);
}

export async function updateWorkReport(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateWorkReportSchema>;
  const record = await workReportService.update(req.user!.sub, req.user!.tenantId, req.params.id, body, requestMeta(req));
  sendOk(res, record);
}

export async function reviewWorkReport(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof reviewWorkReportSchema>;
  const hasReviewPermission = roleHasPermission(req.user!.role, PERMISSIONS.WORK_REPORT_REVIEW);
  const record = await workReportService.review(
    req.user!.sub,
    req.user!.tenantId,
    req.params.id,
    body,
    hasReviewPermission,
    requestMeta(req),
  );
  sendOk(res, record);
}

export async function getWorkReport(req: Request, res: Response): Promise<void> {
  const canReadTenant = roleHasPermission(req.user!.role, PERMISSIONS.WORK_REPORT_READ_TENANT);
  const record = await workReportService.getById(req.user!.tenantId, req.params.id, { userId: req.user!.sub, canReadTenant });
  sendOk(res, record);
}

export async function listWorkReports(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listWorkReportQuerySchema>;
  const canReadTenant = roleHasPermission(req.user!.role, PERMISSIONS.WORK_REPORT_READ_TENANT);
  const { rows, meta } = await workReportService.list(req.user!.tenantId, { userId: req.user!.sub, canReadTenant }, query);
  sendPaginated(res, rows, meta);
}

export async function listReviewQueue(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listWorkReportQuerySchema>;
  const canReviewTenant = roleHasPermission(req.user!.role, PERMISSIONS.WORK_REPORT_REVIEW);
  const { rows, meta } = await workReportService.listReviewQueue(
    req.user!.tenantId,
    req.user!.sub,
    canReviewTenant,
    query.page,
    query.limit,
  );
  sendPaginated(res, rows, meta);
}
