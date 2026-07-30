import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const startTimerSchema = z.object({
  taskId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export const stopTimerSchema = z.object({
  description: z.string().max(500).optional(),
});

export const manualTimeLogSchema = z.object({
  taskId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  startedAt: z.coerce.date(),
  durationMinutes: z.number().int().min(1).max(1440),
});

export const listTimeLogQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const timeLogIdParamSchema = z.object({
  id: z.string().uuid(),
});
