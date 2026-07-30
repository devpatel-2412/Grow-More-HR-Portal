import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  category: z.string().min(1).max(120),
  content: z.string().min(1).max(50000),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  category: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(50000).optional(),
});

export const listArticlesQuerySchema = paginationQuerySchema.extend({
  category: z.string().max(120).optional(),
  search: z.string().max(200).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
