import { prisma } from '../../db/prisma.js';
import type { Prisma, VendorStatus } from '@prisma/client';

export class VendorRepository {
  create(data: Prisma.VendorCreateInput) {
    return prisma.vendor.create({ data });
  }

  findById(id: string) {
    return prisma.vendor.findUnique({ where: { id } });
  }

  findByName(tenantId: string, name: string) {
    return prisma.vendor.findUnique({ where: { tenantId_name: { tenantId, name } } });
  }

  update(id: string, data: Prisma.VendorUpdateInput) {
    return prisma.vendor.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.vendor.delete({ where: { id } });
  }

  countInventoryItems(id: string) {
    return prisma.inventoryItem.count({ where: { vendorId: id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: VendorStatus; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.VendorWhereInput = {
      tenantId,
      status: filter.status,
      OR: filter.search
        ? [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { contactName: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.vendor.findMany({ where, orderBy, skip, take }),
      prisma.vendor.count({ where }),
    ]);
    return { rows, total };
  }
}
