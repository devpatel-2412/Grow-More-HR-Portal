import { z } from 'zod';

export const EMPLOYEE_STATUSES = ['ACTIVE', 'ONBOARDING', 'OFFBOARDING', 'TERMINATED', 'RESIGNED'] as const;

export const createEmployeeSchema = z.object({
  userId: z.string().uuid('Select a user'),
  employeeId: z.string().min(2, 'Required').max(40),
  firstName: z.string().min(1, 'Required').max(80),
  lastName: z.string().min(1, 'Required').max(80),
  phone: z.string().max(30).optional().or(z.literal('')),
  department: z.string().min(1, 'Required').max(80),
  designation: z.string().min(1, 'Required').max(80),
  dateOfJoining: z.string().min(1, 'Required'),
});
export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  phone: z.string().max(30).optional().or(z.literal('')),
  department: z.string().min(1, 'Required').max(80),
  designation: z.string().min(1, 'Required').max(80),
  status: z.enum(EMPLOYEE_STATUSES),
  branchId: z.string().optional(),
  teamId: z.string().optional(),
});
export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;
