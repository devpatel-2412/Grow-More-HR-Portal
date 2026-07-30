import type { Request, Response } from 'express';
import { kbService } from './kb.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createArticleSchema, updateArticleSchema, listArticlesQuerySchema } from './kb.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createArticle(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createArticleSchema>;
  sendCreated(res, await kbService.create(req.user!.tenantId, req.user!.sub, body, requestMeta(req)));
}

export async function getArticle(req: Request, res: Response): Promise<void> {
  sendOk(res, await kbService.requireArticle(req.user!.tenantId, req.params.id));
}

export async function updateArticle(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateArticleSchema>;
  sendOk(res, await kbService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteArticle(req: Request, res: Response): Promise<void> {
  await kbService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listArticles(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listArticlesQuerySchema>;
  const { rows, meta } = await kbService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
