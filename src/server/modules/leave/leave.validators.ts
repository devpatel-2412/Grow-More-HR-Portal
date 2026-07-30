import { z } from 'zod';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const submitLeaveSchema = z
  .object({
    leaveType: z.nativeEnum(LeaveType),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isHalfDay: z.boolean().default(false),
    reason: z.string().min(1, 'Reason is required').max(500),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  })
  .refine((data) => !data.isHalfDay || data.startDate.getTime() === data.endDate.getTime(), {
    message: 'A half-day request must have the same start and end date',
    path: ['isHalfDay'],
  });

export const listLeaveQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  status: z.nativeEnum(LeaveStatus).optional(),
  leaveType: z.nativeEnum(LeaveType).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const leaveIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const reviewLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});
