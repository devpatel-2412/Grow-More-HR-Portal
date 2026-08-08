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
  // The company's first user — created as a PENDING_INVITE ADMIN and sent an activation email
  // immediately, same as any other invite (see TenantService.create()). There is no other way
  // to get a new company its first user, since public registration is permanently closed.
  adminEmail: z.string().email(),
  adminFirstName: z.string().min(1).max(80),
  adminLastName: z.string().min(1).max(80),
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
  // null explicitly means "never expire due to inactivity" — nullable() so it can be sent, not just omitted.
  sessionTimeoutMinutes: z.coerce.number().int().min(1).max(43200).nullable().optional(),
  sessionWarningMinutes: z.coerce.number().int().min(1).max(60).optional(),
  rememberMeDurationDays: z.coerce.number().int().min(1).max(365).optional(),
  maxConcurrentSessions: z.coerce.number().int().min(1).max(1000).nullable().optional(),
});

export const listTenantsQuerySchema = paginationQuerySchema;

export const tenantIdParamSchema = z.object({
  id: z.string().uuid(),
});
