import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createBranchSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  isHeadOffice: z.boolean().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const listBranchesQuerySchema = paginationQuerySchema;

export const branchIdParamSchema = z.object({ id: z.string().uuid() });
