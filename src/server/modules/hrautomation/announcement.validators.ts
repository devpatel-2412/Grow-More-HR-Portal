import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createAnnouncementSchema = z
  .object({
    title: z.string().min(1).max(300),
    body: z.string().min(1).max(10000),
    audience: z.enum(['ALL', 'DEPARTMENT']).default('ALL'),
    department: z.string().min(1).max(120).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((data) => data.audience !== 'DEPARTMENT' || !!data.department, {
    message: 'Pick a department for a department-scoped announcement',
    path: ['department'],
  });

export const listAnnouncementsQuerySchema = paginationQuerySchema;

export const idParamSchema = z.object({ id: z.string().uuid() });
