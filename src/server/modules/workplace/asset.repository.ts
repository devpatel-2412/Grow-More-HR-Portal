import { prisma } from '../../db/prisma.js';
import type { Prisma, AssetType, AssetStatus } from '@prisma/client';

export class AssetRepository {
  create(data: Prisma.AssetCreateInput) {
    return prisma.asset.create({ data });
  }

  findById(id: string) {
    return prisma.asset.findUnique({ where: { id } });
  }

  findBySerial(tenantId: string, serialNumber: string) {
    return prisma.asset.findUnique({ where: { tenantId_serialNumber: { tenantId, serialNumber } } });
  }

  update(id: string, data: Prisma.AssetUpdateInput) {
    return prisma.asset.update({ where: { id }, data });
  }

  async findMany(
    tenantId: string,
    filter: { status?: AssetStatus; type?: AssetType; employeeId?: string },
    skip: number,
    take: number,
  ) {
    const where: Prisma.AssetWhereInput = {
      tenantId,
      status: filter.status,
      type: filter.type,
      employeeId: filter.employeeId,
    };
    const [rows, total] = await Promise.all([
      prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.asset.count({ where }),
    ]);
    return { rows, total };
  }
}
