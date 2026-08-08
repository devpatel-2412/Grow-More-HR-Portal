import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Too short').max(120),
  domain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  adminEmail: z.string().email('Enter a valid email address'),
  adminFirstName: z.string().min(1, 'Required').max(80),
  adminLastName: z.string().min(1, 'Required').max(80),
});
export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

export const updateTenantSchema = z.object({
  name: z.string().min(2, 'Too short').max(120),
  logoUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #6366f1'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #ec4899'),
  font: z.string().min(1, 'Required').max(60),
  attendanceShiftStartMinutes: z.number().int().min(0).max(1439).optional(),
  attendanceRequiredWorkMinutes: z.number().int().min(1).max(1440).optional(),
  attendanceAllowedBreakMinutes: z.number().int().min(0).max(1440).optional(),
  attendanceBreakOverageExtendsLogout: z.boolean().optional(),
  gstin: z.string().max(20).optional().or(z.literal('')),
  gstStateCode: z.string().length(2).optional().or(z.literal('')),
  // null explicitly means "never expire due to inactivity" — nullable so it can be sent, not just omitted.
  sessionTimeoutMinutes: z.number().int().min(1).max(43200).nullable().optional(),
  sessionWarningMinutes: z.number().int().min(1).max(60).optional(),
  rememberMeDurationDays: z.number().int().min(1).max(365).optional(),
  maxConcurrentSessions: z.number().int().min(1).max(1000).nullable().optional(),
});
export type UpdateTenantFormValues = z.infer<typeof updateTenantSchema>;
