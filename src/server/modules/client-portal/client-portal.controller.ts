import type { Request, Response } from 'express';
import { clientPortalService } from './client-portal.service.js';
import { sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { listOwnFinanceDocumentsQuerySchema, listOwnProjectsQuerySchema } from './client-portal.validators.js';

export async function getOwnProfile(req: Request, res: Response): Promise<void> {
  sendOk(res, await clientPortalService.getOwnProfile(req.user!.tenantId, req.user!.sub));
}

export async function listOwnFinanceDocuments(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listOwnFinanceDocumentsQuerySchema>;
  const { rows, meta } = await clientPortalService.listOwnFinanceDocuments(req.user!.tenantId, req.user!.sub, query);
  sendPaginated(res, rows, meta);
}

export async function getOwnFinanceDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await clientPortalService.getOwnFinanceDocument(req.user!.tenantId, req.user!.sub, req.params.id));
}

export async function listOwnProjects(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listOwnProjectsQuerySchema>;
  const { rows, meta } = await clientPortalService.listOwnProjects(req.user!.tenantId, req.user!.sub, query);
  sendPaginated(res, rows, meta);
}
