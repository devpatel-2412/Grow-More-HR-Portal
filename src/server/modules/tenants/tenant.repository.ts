import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class TenantRepository {
  findById(id: string) {
    return prisma.tenant.findUnique({ where: { id } });
  }

  findByDomain(domain: string) {
    return prisma.tenant.findUnique({ where: { domain } });
  }

  create(data: Prisma.TenantCreateInput) {
    return prisma.tenant.create({ data });
  }

  update(id: string, data: Prisma.TenantUpdateInput) {
    return prisma.tenant.update({ where: { id }, data });
  }

  async findMany(skip: number, take: number, search?: string) {
    const where: Prisma.TenantWhereInput = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { domain: { contains: search, mode: 'insensitive' } }] }
      : {};
    const [rows, total] = await Promise.all([
      prisma.tenant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.tenant.count({ where }),
    ]);
    return { rows, total };
  }
}
