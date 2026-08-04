import { z } from 'zod';
import { VendorStatus } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(120).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  gstNumber: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  status: z.nativeEnum(VendorStatus).optional(),
});

export const listVendorsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(VendorStatus).optional(),
});

export const vendorIdParamSchema = z.object({ id: z.string().uuid() });
