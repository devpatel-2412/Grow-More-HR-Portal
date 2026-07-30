import { z } from 'zod';
import { VisitorStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const registerVisitorSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(1).max(40),
  hostEmployeeId: z.string().uuid(),
  purpose: z.string().min(1).max(500),
  expectedAt: z.coerce.date(),
});

export const listVisitorsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(VisitorStatus).optional(),
  hostEmployeeId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
