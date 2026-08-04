import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  branchId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  branchId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
});

export const listTeamsQuerySchema = paginationQuerySchema.extend({
  branchId: z.string().uuid().optional(),
});

export const teamIdParamSchema = z.object({ id: z.string().uuid() });
