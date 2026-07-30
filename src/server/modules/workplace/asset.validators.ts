import { z } from 'zod';
import { AssetType, AssetStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  serialNumber: z.string().min(1).max(120),
  type: z.nativeEnum(AssetType),
  notes: z.string().max(2000).optional(),
  purchaseDate: z.coerce.date().optional(),
});

export const assignAssetSchema = z.object({
  employeeId: z.string().uuid(),
});

export const changeAssetStatusSchema = z.object({
  status: z.enum(['UNDER_REPAIR', 'RETIRED', 'AVAILABLE']),
});

export const listAssetsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(AssetStatus).optional(),
  type: z.nativeEnum(AssetType).optional(),
  employeeId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
