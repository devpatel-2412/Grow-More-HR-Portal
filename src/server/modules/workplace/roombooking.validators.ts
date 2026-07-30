import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createRoomBookingSchema = z
  .object({
    roomName: z.string().min(1).max(120),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    purpose: z.string().min(1).max(500),
  })
  .refine((data) => data.endTime > data.startTime, { message: 'End time must be after the start time', path: ['endTime'] });

export const listRoomBookingsQuerySchema = paginationQuerySchema.extend({
  roomName: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
