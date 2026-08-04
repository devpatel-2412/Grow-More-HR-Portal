import { prisma } from '../../db/prisma.js';
import type { Prisma, TemplateType } from '@prisma/client';

export class TemplateRepository {
  create(data: Prisma.CanvaTemplateCreateInput) {
    return prisma.canvaTemplate.create({ data });
  }

  findById(id: string) {
    return prisma.canvaTemplate.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.CanvaTemplateUpdateInput) {
    return prisma.canvaTemplate.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.canvaTemplate.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { type?: TemplateType },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.CanvaTemplateWhereInput = { tenantId, type: filter.type };
    const [rows, total] = await Promise.all([
      prisma.canvaTemplate.findMany({ where, orderBy, skip, take }),
      prisma.canvaTemplate.count({ where }),
    ]);
    return { rows, total };
  }
}

export class GeneratedDocumentRepository {
  create(data: Prisma.GeneratedDocumentCreateInput) {
    return prisma.generatedDocument.create({ data });
  }

  findById(id: string) {
    return prisma.generatedDocument.findUnique({
      where: { id },
      include: { template: true, employee: { include: { user: true } }, generatedBy: true },
    });
  }

  async findMany(
    tenantId: string,
    filter: { employeeId?: string; templateId?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.GeneratedDocumentWhereInput = {
      tenantId,
      employeeId: filter.employeeId,
      templateId: filter.templateId,
    };
    const [rows, total] = await Promise.all([
      prisma.generatedDocument.findMany({ where, orderBy, skip, take }),
      prisma.generatedDocument.count({ where }),
    ]);
    return { rows, total };
  }
}
