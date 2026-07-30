import { z } from 'zod';
import { PayrollStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const setSalaryStructureSchema = z.object({
  employeeId: z.string().uuid(),
  effectiveFrom: z.coerce.date(),
  basicSalary: z.number().min(0).max(100_000_000),
  hra: z.number().min(0).max(100_000_000).default(0),
  allowance: z.number().min(0).max(100_000_000).default(0),
});

export const listSalaryStructuresQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
});

export const generatePayrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const listPayrollRunsQuerySchema = paginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.nativeEnum(PayrollStatus).optional(),
});

export const listPayrollItemsQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const updatePayrollItemSchema = z.object({
  bonus: z.number().min(0).max(100_000_000).optional(),
  overtimeHours: z.number().min(0).max(400).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
