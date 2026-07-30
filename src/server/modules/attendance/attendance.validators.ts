import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const punchInSchema = z.object({
  gpsCoordinates: z.string().max(100).optional(),
  deviceType: z.string().max(40).optional(),
});

export const listAttendanceQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const attendanceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const requestRegularizationSchema = z
  .object({
    date: z.coerce.date(),
    requestedCheckIn: z.coerce.date().optional(),
    requestedCheckOut: z.coerce.date().optional(),
    reason: z.string().min(1, 'Reason is required').max(500),
  })
  .refine((data) => data.requestedCheckIn || data.requestedCheckOut, {
    message: 'Provide at least a requested check-in or check-out time',
    path: ['requestedCheckIn'],
  });

export const listRegularizationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const reviewRegularizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const regularizationIdParamSchema = z.object({
  id: z.string().uuid(),
});
