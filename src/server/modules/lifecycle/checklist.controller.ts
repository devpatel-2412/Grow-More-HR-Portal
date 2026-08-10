import type { Request, Response } from 'express';
import { checklistService } from './checklist.service.js';
import { sendCreated, sendOk, sendNoContent } from '../../shared/utils/response.util.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { resolveEffectivePermissions } from '../../shared/permissions/permission-resolver.service.js';
import type { z } from 'zod';
import type { createChecklistItemSchema, updateChecklistItemSchema } from './checklist.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function listChecklist(req: Request, res: Response): Promise<void> {
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canManage = effective.has(PERMISSIONS.EMPLOYEE_UPDATE);
  const items = await checklistService.list(req.user!.tenantId, req.params.id, { userId: req.user!.sub, canManage });
  sendOk(res, items);
}

export async function createChecklistItem(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createChecklistItemSchema>;
  sendCreated(res, await checklistService.create(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function updateChecklistItem(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateChecklistItemSchema>;
  sendOk(res, await checklistService.update(req.user!.tenantId, req.params.itemId, body, requestMeta(req)));
}

export async function deleteChecklistItem(req: Request, res: Response): Promise<void> {
  await checklistService.delete(req.user!.tenantId, req.params.itemId, requestMeta(req));
  sendNoContent(res);
}
