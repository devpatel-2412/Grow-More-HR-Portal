import type { Request, Response } from 'express';
import { employeeService } from './employee.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { z } from 'zod';
import type { createEmployeeProfileSchema, updateEmployeeProfileSchema, listEmployeesQuerySchema } from './employee.validators.js';

function requestContext(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createEmployeeProfileSchema>;
  const profile = await employeeService.create(req.user!.tenantId, body, requestContext(req));
  sendCreated(res, profile);
}

export async function getEmployee(req: Request, res: Response): Promise<void> {
  const profile = await employeeService.getById(req.user!.tenantId, req.params.id);
  sendOk(res, profile);
}

export async function getMyEmployeeProfile(req: Request, res: Response): Promise<void> {
  const profile = await employeeService.getByUserId(req.user!.sub);
  if (!profile) throw new NotFoundError('No employee profile for this account');
  sendOk(res, profile);
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateEmployeeProfileSchema>;
  const profile = await employeeService.update(req.user!.tenantId, req.params.id, body, requestContext(req));
  sendOk(res, profile);
}

export async function listEmployees(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listEmployeesQuerySchema>;
  const { rows, meta } = await employeeService.list(req.user!.tenantId, query);
  sendPaginated(res, rows, meta);
}
