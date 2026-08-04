import type { Request, Response } from 'express';
import { teamService } from './team.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createTeamSchema, updateTeamSchema, listTeamsQuerySchema } from './team.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createTeamSchema>;
  sendCreated(res, await teamService.create(req.user!.tenantId, body, requestMeta(req)));
}

export async function getTeam(req: Request, res: Response): Promise<void> {
  sendOk(res, await teamService.requireTeam(req.user!.tenantId, req.params.id));
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateTeamSchema>;
  sendOk(res, await teamService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
  await teamService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listTeams(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTeamsQuerySchema>;
  const { rows, meta } = await teamService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
