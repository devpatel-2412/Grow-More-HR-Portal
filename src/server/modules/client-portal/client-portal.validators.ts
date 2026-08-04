import { z } from 'zod';
import { FinanceType, FinanceStatus, ProjectStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const listOwnFinanceDocumentsQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(FinanceType).optional(),
  status: z.nativeEnum(FinanceStatus).optional(),
});

export const listOwnProjectsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});
