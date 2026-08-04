import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createEmployeeProfileSchema = z.object({
  userId: z.string().uuid(),
  employeeId: z.string().min(2).max(40),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().max(30).optional(),
  department: z.string().min(1).max(80),
  designation: z.string().min(1).max(80),
  dateOfJoining: z.coerce.date(),
  dateOfBirth: z.coerce.date().optional(),
  managerId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

export const updateEmployeeProfileSchema = z.object({
  phone: z.string().max(30).optional(),
  department: z.string().min(1).max(80).optional(),
  designation: z.string().min(1).max(80).optional(),
  status: z.enum(['ACTIVE', 'ONBOARDING', 'OFFBOARDING', 'TERMINATED', 'RESIGNED']).optional(),
  managerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
});

export const listEmployeesQuerySchema = paginationQuerySchema.extend({
  department: z.string().optional(),
  status: z.string().optional(),
  managerId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

export const employeeIdParamSchema = z.object({
  id: z.string().uuid(),
});
