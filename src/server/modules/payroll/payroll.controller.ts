import type { Request, Response } from 'express';
import { payrollService } from './payroll.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { PERMISSIONS } from '../../shared/permissions/permissions.js';
import { resolveEffectivePermissions } from '../../shared/permissions/permission-resolver.service.js';
import type { z } from 'zod';
import type {
  setSalaryStructureSchema,
  listSalaryStructuresQuerySchema,
  generatePayrollRunSchema,
  listPayrollRunsQuerySchema,
  listPayrollItemsQuerySchema,
  updatePayrollItemSchema,
} from './payroll.validators.js';

function requestMeta(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function setSalaryStructure(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof setSalaryStructureSchema>;
  const structure = await payrollService.setSalaryStructure(req.user!.tenantId, body, requestMeta(req));
  sendCreated(res, structure);
}

export async function listSalaryStructures(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listSalaryStructuresQuerySchema>;
  const { rows, meta } = await payrollService.listSalaryStructures(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function generatePayrollRun(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof generatePayrollRunSchema>;
  const run = await payrollService.generateRun(req.user!.tenantId, body.month, body.year, requestMeta(req));
  sendCreated(res, run);
}

export async function getPayrollRun(req: Request, res: Response): Promise<void> {
  const run = await payrollService.getRun(req.user!.tenantId, req.params.id);
  sendOk(res, run);
}

export async function listPayrollRuns(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listPayrollRunsQuerySchema>;
  const { rows, meta } = await payrollService.listRuns(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}

export async function approvePayrollRun(req: Request, res: Response): Promise<void> {
  const run = await payrollService.transitionRun(req.user!.tenantId, req.user!.sub, req.params.id, 'APPROVED', requestMeta(req));
  sendOk(res, run);
}

export async function markPayrollRunPaid(req: Request, res: Response): Promise<void> {
  const run = await payrollService.transitionRun(req.user!.tenantId, req.user!.sub, req.params.id, 'PAID', requestMeta(req));
  sendOk(res, run);
}

export async function cancelPayrollRun(req: Request, res: Response): Promise<void> {
  const run = await payrollService.transitionRun(req.user!.tenantId, req.user!.sub, req.params.id, 'CANCELLED', requestMeta(req));
  sendOk(res, run);
}

export async function updatePayrollItem(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updatePayrollItemSchema>;
  const item = await payrollService.updateItem(req.user!.tenantId, req.params.id, body);
  sendOk(res, item);
}

export async function listPayslips(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listPayrollItemsQuerySchema>;
  const effective = await resolveEffectivePermissions(req.user!.sub, req.user!.tenantId, req.user!.role);
  const canReadTenant = effective.has(PERMISSIONS.PAYROLL_READ_TENANT);
  const { rows, meta } = await payrollService.listItems(
    req.user!.tenantId,
    { userId: req.user!.sub, canReadTenant },
    query,
  );
  sendPaginated(res, rows, meta);
}
