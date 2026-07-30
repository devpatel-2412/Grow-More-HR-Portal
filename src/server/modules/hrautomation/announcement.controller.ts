import type { Request, Response } from 'express';
import { announcementService } from './announcement.service.js';
import { sendCreated, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createAnnouncementSchema, listAnnouncementsQuerySchema } from './announcement.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function publishAnnouncement(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createAnnouncementSchema>;
  sendCreated(res, await announcementService.publish(req.user!.tenantId, req.user!.sub, body, requestMeta(req)));
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  await announcementService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listAnnouncementsQuerySchema>;
  const { rows, meta } = await announcementService.list(req.user!.tenantId, req.user!.sub, query);
  sendPaginated(res, rows, meta);
}
