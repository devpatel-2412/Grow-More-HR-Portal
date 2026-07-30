import { z } from 'zod';
import { TicketCategory, TicketStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createTicketSchema = z.object({
  category: z.nativeEnum(TicketCategory),
  subject: z.string().min(1).max(300),
  description: z.string().min(1).max(8000),
});

export const changeTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const assignTicketSchema = z.object({
  assignedToId: z.string().uuid().nullable(),
});

export const addTicketCommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const listTicketsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assignedToId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
