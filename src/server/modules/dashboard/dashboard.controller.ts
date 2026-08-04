import type { Request, Response } from 'express';
import { dashboardService } from './dashboard.service.js';
import { sendOk } from '../../shared/utils/response.util.js';

export async function getAdminSummary(req: Request, res: Response): Promise<void> {
  sendOk(res, await dashboardService.getAdminSummary(req.user!.tenantId));
}
