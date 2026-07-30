import type { Request, Response } from 'express';
import { tenantService } from './tenant.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { assertSameTenant } from '../../shared/middleware/tenant-scope.middleware.js';
import type { z } from 'zod';
import type { createTenantSchema, updateTenantSchema, listTenantsQuerySchema } from './tenant.validators.js';

function requestContext(req: Request) {
  return { actorUserId: req.user?.sub, ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export async function createTenant(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof createTenantSchema>;
  const tenant = await tenantService.create(body, requestContext(req));
  sendCreated(res, tenant);
}

export async function getTenant(req: Request, res: Response): Promise<void> {
  const tenant = await tenantService.getById(req.params.id);
  assertSameTenant(req.user!.tenantId, tenant.id, req.user!.role);
  sendOk(res, tenant);
}

export async function updateTenant(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof updateTenantSchema>;
  assertSameTenant(req.user!.tenantId, req.params.id, req.user!.role);
  const tenant = await tenantService.update(req.params.id, body, requestContext(req));
  sendOk(res, tenant);
}

export async function listTenants(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listTenantsQuerySchema>;
  const { rows, meta } = await tenantService.list(query.page, query.limit, query.search);
  sendPaginated(res, rows, meta);
}
