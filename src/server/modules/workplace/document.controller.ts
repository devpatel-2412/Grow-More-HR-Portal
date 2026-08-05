import type { Request, Response } from 'express';
import { documentService } from './document.service.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import { BadRequestError } from '../../shared/errors/app-error.js';
import type { UploadedFileInput } from '../../shared/storage/storage.service.js';
import type { z } from 'zod';
import type { createDocumentSchema, listDocumentsQuerySchema } from './document.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function toUploadedFile(file: Express.Multer.File): UploadedFileInput {
  return { buffer: file.buffer, mimeType: file.mimetype, fileName: file.originalname };
}

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new BadRequestError('At least one file is required');
  const body = req.body as z.infer<typeof createDocumentSchema>;
  const documents = await documentService.upload(req.user!.tenantId, req.user!.sub, files.map(toUploadedFile), body, requestMeta(req));
  sendCreated(res, documents);
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.requireDocument(req.user!.tenantId, req.params.id));
}

export async function downloadDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.getDownloadUrl(req.user!.tenantId, req.params.id, requestMeta(req)));
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
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new BadRequestError('A file is required');
  sendOk(res, await documentService.replaceFile(req.user!.tenantId, req.user!.sub, req.params.id, toUploadedFile(file), requestMeta(req)));
}

export async function listDocumentVersions(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.listVersions(req.user!.tenantId, req.params.id));
}

export async function downloadDocumentVersion(req: Request, res: Response): Promise<void> {
  sendOk(res, await documentService.getVersionDownloadUrl(req.user!.tenantId, req.params.id, req.params.versionId, requestMeta(req)));
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listDocumentsQuerySchema>;
  const { rows, meta } = await documentService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
