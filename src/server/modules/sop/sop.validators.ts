import { z } from 'zod';
import { SopStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createSopSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  body: z.string().min(1).max(50000),
  fileUrl: z.string().url().max(2000).optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateSopSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().max(100).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  body: z.string().min(1).max(50000).optional(),
  fileUrl: z.string().url().max(2000).nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
});

export const listSopsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(SopStatus).optional(),
  category: z.string().optional(),
  department: z.string().optional(),
});

export const sopIdParamSchema = z.object({ id: z.string().uuid() });
