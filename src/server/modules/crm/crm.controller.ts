import type { Request, Response } from 'express';
import { crmService } from './crm.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  createLeadSchema,
  updateLeadSchema,
  changeLeadStageSchema,
  listLeadsQuerySchema,
  logActivitySchema,
  listActivitiesQuerySchema,
} from './crm.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createLead(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createLeadSchema>;
  sendCreated(res, await crmService.createLead(req.user!.tenantId, body, requestMeta(req)));
}

export async function getLead(req: Request, res: Response): Promise<void> {
  sendOk(res, await crmService.getLead(req.user!.tenantId, req.params.id));
}

export async function updateLead(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateLeadSchema>;
  sendOk(res, await crmService.updateLead(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function changeLeadStage(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof changeLeadStageSchema>;
  sendOk(res, await crmService.changeLeadStage(req.user!.tenantId, req.params.id, body.status, body.lostReason, requestMeta(req)));
}

export async function deleteLead(req: Request, res: Response): Promise<void> {
  await crmService.deleteLead(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listLeads(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listLeadsQuerySchema>;
  const { rows, meta } = await crmService.listLeads(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function getLeadPipeline(req: Request, res: Response): Promise<void> {
  sendOk(res, await crmService.leadPipelineSummary(req.user!.tenantId));
}

export async function logActivity(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof logActivitySchema>;
  sendCreated(res, await crmService.logActivity(req.user!.tenantId, req.user!.sub, body, requestMeta(req)));
}

export async function listActivities(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listActivitiesQuerySchema>;
  const { rows, meta } = await crmService.listActivities(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
