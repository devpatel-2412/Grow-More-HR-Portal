import type { Request, Response } from 'express';
import { templateService } from './template.service.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  generateDocumentSchema,
  listGeneratedDocumentsQuerySchema,
} from './template.validators.js';

const employeeRepository = new EmployeeRepository();

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createTemplateSchema>;
  const author = await employeeRepository.findByUserId(req.user!.sub);
  sendCreated(res, await templateService.create(req.user!.tenantId, author?.id, body, requestMeta(req)));
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  sendOk(res, await templateService.requireTemplate(req.user!.tenantId, req.params.id));
}

export async function updateTemplate(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateTemplateSchema>;
  sendOk(res, await templateService.update(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  await templateService.delete(req.user!.tenantId, req.params.id, requestMeta(req));
  sendNoContent(res);
}

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTemplatesQuerySchema>;
  const { rows, meta } = await templateService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function generateDocument(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof generateDocumentSchema>;
  sendCreated(
    res,
    await templateService.generate(req.user!.tenantId, req.user!.sub, req.params.id, body, requestMeta(req)),
  );
}

export async function listGeneratedDocuments(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listGeneratedDocumentsQuerySchema>;
  const { rows, meta } = await templateService.listGeneratedDocuments(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
