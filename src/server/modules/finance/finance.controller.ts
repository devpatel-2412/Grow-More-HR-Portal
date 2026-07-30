import type { Request, Response } from 'express';
import { financeService } from './finance.service.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { sendCreated, sendOk, sendPaginated, sendNoContent } from '../../shared/utils/response.util.js';
import type { z } from 'zod';
import type {
  createFinanceDocumentSchema,
  updateFinanceDocumentSchema,
  recordPaymentSchema,
  listFinanceDocumentsQuerySchema,
} from './finance.validators.js';

const employeeRepository = new EmployeeRepository();

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createFinanceDocument(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createFinanceDocumentSchema>;
  const author = await employeeRepository.findByUserId(req.user!.sub);
  const document = await financeService.createDocument(req.user!.tenantId, author?.id, body, requestMeta(req));
  sendCreated(res, document);
}

export async function getFinanceDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await financeService.getDocument(req.user!.tenantId, req.params.id));
}

export async function updateFinanceDocument(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateFinanceDocumentSchema>;
  sendOk(res, await financeService.updateDocument(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function sendFinanceDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await financeService.sendDocument(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function voidFinanceDocument(req: Request, res: Response): Promise<void> {
  sendOk(res, await financeService.voidDocument(req.user!.tenantId, req.params.id, requestMeta(req)));
}

export async function deleteFinanceDocument(req: Request, res: Response): Promise<void> {
  await financeService.deleteDocument(req.user!.tenantId, req.params.id);
  sendNoContent(res);
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof recordPaymentSchema>;
  sendCreated(res, await financeService.recordPayment(req.user!.tenantId, req.params.id, body, requestMeta(req)));
}

export async function listFinanceDocuments(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listFinanceDocumentsQuerySchema>;
  const { rows, meta } = await financeService.listDocuments(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function getFinanceSummary(req: Request, res: Response): Promise<void> {
  sendOk(res, await financeService.summary(req.user!.tenantId));
}
