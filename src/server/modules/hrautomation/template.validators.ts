import { z } from 'zod';
import { TemplateType } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

const layoutFieldSchema = z.object({
  id: z.string().min(1).max(60),
  variableKey: z.string().min(1).max(60),
  x: z.number().min(0).max(4000),
  y: z.number().min(0).max(4000),
  fontSize: z.number().min(4).max(400).default(16),
  color: z.string().min(1).max(30).default('#000000'),
  fontWeight: z.enum(['normal', 'bold']).default('normal'),
});

const POSTER_TYPES = new Set<TemplateType>(['POSTER_WELCOME', 'POSTER_BIRTHDAY', 'POSTER_PROMOTION']);

export const createTemplateSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.nativeEnum(TemplateType),
    backgroundUrl: z.string().url().max(2000).optional(),
    layoutFields: z.array(layoutFieldSchema).max(50).optional(),
    bodyTemplate: z.string().max(20000).optional(),
  })
  .superRefine((data, ctx) => {
    const isPoster = POSTER_TYPES.has(data.type);
    if (isPoster && !data.backgroundUrl) {
      ctx.addIssue({ code: 'custom', message: 'A poster template needs a background image', path: ['backgroundUrl'] });
    }
    if (!isPoster && !data.bodyTemplate) {
      ctx.addIssue({ code: 'custom', message: 'A letter template needs a body with placeholders', path: ['bodyTemplate'] });
    }
  });

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  backgroundUrl: z.string().url().max(2000).nullable().optional(),
  layoutFields: z.array(layoutFieldSchema).max(50).nullable().optional(),
  bodyTemplate: z.string().max(20000).nullable().optional(),
});

export const listTemplatesQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(TemplateType).optional(),
});

export const generateDocumentSchema = z.object({
  employeeId: z.string().uuid(),
});

export const listGeneratedDocumentsQuerySchema = paginationQuerySchema.extend({
  employeeId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export function isPosterType(type: TemplateType): boolean {
  return POSTER_TYPES.has(type);
}
