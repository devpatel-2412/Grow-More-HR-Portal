import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  domain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font: z.string().min(1).max(60).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font: z.string().min(1).max(60).optional(),
  attendanceShiftStartMinutes: z.coerce.number().int().min(0).max(1439).optional(),
  attendanceRequiredWorkMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  attendanceAllowedBreakMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  attendanceBreakOverageExtendsLogout: z.coerce.boolean().optional(),
  gstin: z.string().max(20).optional(),
  gstStateCode: z.string().length(2).optional(),
});

export const listTenantsQuerySchema = paginationQuerySchema;

export const tenantIdParamSchema = z.object({
  id: z.string().uuid(),
});
