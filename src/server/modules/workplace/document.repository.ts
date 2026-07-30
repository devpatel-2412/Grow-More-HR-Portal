import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class DocumentRepository {
  create(data: Prisma.SecureDocumentCreateInput) {
    return prisma.secureDocument.create({ data });
  }

  findById(id: string) {
    return prisma.secureDocument.findUnique({ where: { id } });
  }

  delete(id: string) {
    return prisma.secureDocument.delete({ where: { id } });
  }

  async findMany(tenantId: string, filter: { folderPath?: string; search?: string }, skip: number, take: number) {
    const where: Prisma.SecureDocumentWhereInput = {
      tenantId,
      folderPath: filter.folderPath,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.secureDocument.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.secureDocument.count({ where }),
    ]);
    return { rows, total };
  }
}
