import type { Request, Response } from 'express';
import { documentService } from './document.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type { createDocumentSchema, replaceDocumentFileSchema, listDocumentsQuerySchema } from './document.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createDocumentSchema>;
  sendCreated(res, await documentService.upload(req.user!.tenantId, req.user!.sub, body, requestMeta(req)));
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.requireDocument(req.user!.tenantId, req.params.id));
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  await documentService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function archiveDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.archive(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function restoreDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.restore(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function replaceDocumentFile(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof replaceDocumentFileSchema>;
  sendOk(res, await documentService.replaceFile(req.user!.tenantId, req.user!.sub, req.params.id, body, requestMeta(req)));
}

export async function listDocumentVersions(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.listVersions(req.user!.tenantId, req.params.id));
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listDocumentsQuerySchema>;
  const { rows, meta } = await documentService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
