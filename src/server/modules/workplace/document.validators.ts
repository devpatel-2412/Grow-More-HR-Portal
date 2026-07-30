import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createDocumentSchema = z.object({
  name: z.string().min(1).max(300),
  folderPath: z.string().min(1).max(500).default('/'),
  fileUrl: z.string().url().max(2000),
  expiresAt: z.coerce.date().optional(),
  isDigitallySigned: z.boolean().default(false),
});

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  folderPath: z.string().max(500).optional(),
  search: z.string().max(200).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
