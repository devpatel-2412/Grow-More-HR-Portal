import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  actorUserId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
