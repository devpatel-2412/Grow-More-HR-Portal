import type { Request, Response } from 'express';
import { branchService } from './branch.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createBranchSchema, updateBranchSchema, listBranchesQuerySchema } from './branch.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createBranch(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createBranchSchema>;
  sendCreated(res, await branchService.create(req.user!.tenantId, body, requestMeta(req)));
}

export async function getBranch(req: Request, res: Response): Promise<void> {
  sendOk(res, await branchService.requireBranch(req.user!.tenantId, req.params.id));
}

export async function updateBranch(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateBranchSchema>;
  sendOk(res, await branchService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteBranch(req: Request, res: Response): Promise<void> {
  await branchService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listBranches(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listBranchesQuerySchema>;
  const { rows, meta } = await branchService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
