import { z } from 'zod';
import { FinanceType, FinanceStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  hsnCode: z.string().max(20).optional(),
  quantity: z.number().min(0.01).max(1_000_000).default(1),
  unitPrice: z.number().min(0).max(1_000_000_000),
});

export const createFinanceDocumentSchema = z.object({
  type: z.nativeEnum(FinanceType),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  currency: z.string().length(3).default('USD'),
  taxRate: z.number().min(0).max(100).default(0),
  /** 2-digit GST state code of the counterparty — set alongside the tenant's own gstStateCode to split tax into CGST/SGST vs IGST. */
  placeOfSupplyStateCode: z.string().length(2).optional(),
  notes: z.string().max(4000).optional(),
  clientPortalId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

export const updateFinanceDocumentSchema = z.object({
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  placeOfSupplyStateCode: z.string().length(2).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01).max(1_000_000_000),
  paidAt: z.coerce.date(),
  method: z.string().min(1).max(120),
  reference: z.string().max(200).optional(),
});

export const listFinanceDocumentsQuerySchema = paginationQuerySchema.extend({
  type: z.nativeEnum(FinanceType).optional(),
  status: z.nativeEnum(FinanceStatus).optional(),
  clientPortalId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const profitAndLossQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
