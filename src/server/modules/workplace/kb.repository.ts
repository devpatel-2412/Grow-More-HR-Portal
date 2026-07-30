import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class KbRepository {
  create(data: Prisma.KnowledgeBaseArticleCreateInput) {
    return prisma.knowledgeBaseArticle.create({ data });
  }

  findById(id: string) {
    return prisma.knowledgeBaseArticle.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.KnowledgeBaseArticleUpdateInput) {
    return prisma.knowledgeBaseArticle.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.knowledgeBaseArticle.delete({ where: { id } });
  }

  async findMany(tenantId: string, filter: { category?: string; search?: string }, skip: number, take: number) {
    const where: Prisma.KnowledgeBaseArticleWhereInput = {
      tenantId,
      category: filter.category,
      OR: filter.search
        ? [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { content: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.knowledgeBaseArticle.count({ where }),
    ]);
    return { rows, total };
  }
}
