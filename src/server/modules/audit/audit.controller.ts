import type { Request, Response } from 'express';
import { auditLogService } from './audit.service.js';
import { sendPaginated } from '../../shared/utils/response.util.js';
import type { listAuditLogsQuerySchema } from './audit.validators.js';
import type { z } from 'zod';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof listAuditLogsQuerySchema>;
  const { rows, meta } = await auditLogService.list(
    {
      tenantId: req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.tenantId,
      actorUserId: query.actorUserId,
      action: query.action,
      from: query.from,
      to: query.to,
    },
    query.page,
    query.limit,
    query.sort,
  );
  sendPaginated(res, rows, meta);
}
