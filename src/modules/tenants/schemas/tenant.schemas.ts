import { z } from 'zod';

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
});
export type UpdateTenantFormValues = z.infer<typeof updateTenantSchema>;
