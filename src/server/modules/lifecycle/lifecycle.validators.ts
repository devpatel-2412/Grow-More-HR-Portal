import { z } from 'zod';

export const confirmEmployeeSchema = z.object({
  effectiveDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
});

export const promoteEmployeeSchema = z.object({
  effectiveDate: z.coerce.date(),
  newDesignation: z.string().min(1).max(80),
  newDepartment: z.string().min(1).max(80).optional(),
  notes: z.string().max(2000).optional(),
});

export const transferEmployeeSchema = z
  .object({
    effectiveDate: z.coerce.date(),
    branchId: z.string().uuid().nullable().optional(),
    teamId: z.string().uuid().nullable().optional(),
    managerId: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.branchId === undefined && data.teamId === undefined && data.managerId === undefined) {
      ctx.addIssue({ code: 'custom', message: 'At least one of branchId, teamId, or managerId is required', path: ['branchId'] });
    }
  });

export const initiateExitSchema = z.object({
  effectiveDate: z.coerce.date(),
  reason: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const completeExitSchema = z.object({
  effectiveDate: z.coerce.date(),
  outcome: z.enum(['TERMINATED', 'RESIGNED']),
  notes: z.string().max(2000).optional(),
});

export const employeeIdParamSchema = z.object({ id: z.string().uuid() });
