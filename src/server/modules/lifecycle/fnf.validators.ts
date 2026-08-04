import { z } from 'zod';

export const upsertFnfSettlementSchema = z.object({
  lastWorkingDay: z.coerce.date(),
  pendingSalary: z.coerce.number().min(0).default(0),
  leaveEncashment: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
});

export const updateFnfStatusSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'PAID']),
});

export const employeeIdParamSchema = z.object({ id: z.string().uuid() });
