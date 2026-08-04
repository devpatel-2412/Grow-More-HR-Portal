import type { Request, Response } from 'express';
import { notificationService } from './notification.service.js';
import { sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { listNotificationsQuerySchema } from './notification.validators.js';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listNotificationsQuerySchema>;
  const { rows, meta } = await notificationService.list(req.user!.sub, query.page, query.limit, query.unreadOnly);
  sendPaginated(res, rows, meta);
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  sendOk(res, { count: await notificationService.unreadCount(req.user!.sub) });
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  sendOk(res, await notificationService.markRead(req.user!.sub, req.params.id));
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  await notificationService.markAllRead(req.user!.sub);
  sendOk(res, { message: 'All notifications marked as read.' });
}
