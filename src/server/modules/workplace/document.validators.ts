import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

/** Shared metadata for a batch upload — `name` is deliberately not here: each file in the batch
 * takes its own original filename, matching how every mainstream drag-and-drop uploader behaves. */
export const createDocumentSchema = z.object({
  category: z.string().max(120).optional(),
  folderPath: z.string().min(1).max(500).default('/'),
  expiresAt: z.coerce.date().optional(),
  isDigitallySigned: z.coerce.boolean().default(false),
  /** Generic linkage to the record this batch belongs to, e.g. an employee profile or a leave
   * request — see SecureDocument.relatedEntityType in schema.prisma. */
  relatedEntityType: z.string().max(60).optional(),
  relatedEntityId: z.string().uuid().optional(),
});

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  folderPath: z.string().max(500).optional(),
  category: z.string().max(120).optional(),
  search: z.string().max(200).optional(),
  relatedEntityType: z.string().max(60).optional(),
  relatedEntityId: z.string().uuid().optional(),
  /** Defaults to only non-archived documents — pass true to see the archive bin instead. */
  archived: z.coerce.boolean().default(false),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
export const versionIdParamSchema = z.object({ id: z.string().uuid(), versionId: z.string().uuid() });
