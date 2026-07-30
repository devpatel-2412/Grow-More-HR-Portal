import { z } from 'zod';
import { LeadStatus, ClientStatus, CrmActivityType } from '@prisma/client';
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

export const convertLeadSchema = z.object({
  industry: z.string().max(120).optional(),
  website: z.string().max(500).optional(),
  address: z.string().max(500).optional(),
  accountManagerId: z.string().uuid().optional(),
});

export const createClientSchema = z.object({
  companyName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  phone: z.string().max(40).optional(),
  website: z.string().max(500).optional(),
  address: z.string().max(500).optional(),
  industry: z.string().max(120).optional(),
  logoUrl: z.string().url().max(2000).optional(),
  accountManagerId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
});

export const updateClientSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  phone: z.string().max(40).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  industry: z.string().max(120).nullable().optional(),
  logoUrl: z.string().url().max(2000).nullable().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  accountManagerId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const listClientsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ClientStatus).optional(),
  accountManagerId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export const createContactSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  designation: z.string().max(120).optional(),
  isPrimary: z.boolean().default(false),
});

export const logActivitySchema = z
  .object({
    type: z.nativeEnum(CrmActivityType),
    subject: z.string().min(1).max(300),
    body: z.string().max(4000).optional(),
    occurredAt: z.coerce.date(),
    leadId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
  })
  .refine((data) => !!data.leadId !== !!data.clientId, {
    message: 'An activity must be attached to exactly one of a lead or a client',
    path: ['leadId'],
  });

export const listActivitiesQuerySchema = paginationQuerySchema.extend({
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  type: z.nativeEnum(CrmActivityType).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
