import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(60),
  category: z.string().max(100).optional(),
  unit: z.string().min(1).max(20).default('pcs'),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  unitCost: z.coerce.number().min(0).default(0),
  vendorId: z.string().uuid().optional(),
  openingQuantity: z.coerce.number().int().min(0).default(0),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).nullable().optional(),
  unit: z.string().min(1).max(20).optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  unitCost: z.coerce.number().min(0).optional(),
  vendorId: z.string().uuid().nullable().optional(),
});

export const stockInSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  vendorId: z.string().uuid().optional(),
  reference: z.string().max(200).optional(),
});

export const stockOutSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  reference: z.string().max(200).optional(),
});

export const adjustStockSchema = z.object({
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'Adjustment cannot be zero'),
  reference: z.string().max(200).optional(),
});

export const listInventoryItemsQuerySchema = paginationQuerySchema.extend({
  category: z.string().optional(),
  vendorId: z.string().uuid().optional(),
});

export const itemIdParamSchema = z.object({ id: z.string().uuid() });
