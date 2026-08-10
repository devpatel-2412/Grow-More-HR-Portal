import { z } from 'zod';
import { LeadStatus, CrmActivityType } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createLeadSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  source: z.string().max(120).optional(),
  estimatedValue: z.number().min(0).max(1_000_000_000).default(0),
  ownerId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
});

export const updateLeadSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(160).optional(),
  phone: z.string().max(40).nullable().optional(),
  source: z.string().max(120).nullable().optional(),
  estimatedValue: z.number().min(0).max(1_000_000_000).optional(),
  ownerId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const changeLeadStageSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  lostReason: z.string().max(1000).optional(),
});

export const listLeadsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(LeadStatus).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export const logActivitySchema = z.object({
  type: z.nativeEnum(CrmActivityType),
  subject: z.string().min(1).max(300),
  body: z.string().max(4000).optional(),
  occurredAt: z.coerce.date(),
  leadId: z.string().uuid(),
});

export const listActivitiesQuerySchema = paginationQuerySchema.extend({
  leadId: z.string().uuid().optional(),
  type: z.nativeEnum(CrmActivityType).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
