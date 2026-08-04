import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class DocumentRepository {
  /** Also creates the version-1 history row, so a document's version history is always complete from the start. */
  create(
    tenantId: string,
    fileUrl: string,
    uploadedById: string | undefined,
    data: Omit<Prisma.SecureDocumentCreateInput, 'tenant' | 'fileUrl'>,
  ) {
    return prisma.secureDocument.create({
      data: {
        ...data,
        fileUrl,
        tenant: { connect: { id: tenantId } },
        versions: {
          create: {
            tenant: { connect: { id: tenantId } },
            version: 1,
            fileUrl,
            uploadedBy: uploadedById ? { connect: { id: uploadedById } } : undefined,
          },
        },
      },
    });
  }

  findById(id: string) {
    return prisma.secureDocument.findUnique({ where: { id } });
  }

  delete(id: string) {
    return prisma.secureDocument.delete({ where: { id } });
  }

  archive(id: string) {
    return prisma.secureDocument.update({ where: { id }, data: { archived: true, archivedAt: new Date() } });
  }

  restore(id: string) {
    return prisma.secureDocument.update({ where: { id }, data: { archived: false, archivedAt: null } });
  }

  /** Bumps to the next version and appends a history row — the prior fileUrl stays intact in its own DocumentVersion row. */
  async replaceFile(id: string, fileUrl: string, tenantId: string, uploadedById: string | undefined) {
    const current = await prisma.secureDocument.findUniqueOrThrow({ where: { id } });
    const nextVersion = current.version + 1;
    const [document] = await prisma.$transaction([
      prisma.secureDocument.update({ where: { id }, data: { fileUrl, version: nextVersion } }),
      prisma.documentVersion.create({
        data: {
          tenant: { connect: { id: tenantId } },
          document: { connect: { id } },
          version: nextVersion,
          fileUrl,
          uploadedBy: uploadedById ? { connect: { id: uploadedById } } : undefined,
        },
      }),
    ]);
    return document;
  }

  findVersions(documentId: string) {
    return prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async findMany(
    tenantId: string,
    filter: { folderPath?: string; category?: string; search?: string; archived: boolean },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.SecureDocumentWhereInput = {
      tenantId,
      folderPath: filter.folderPath,
      category: filter.category,
      archived: filter.archived,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.secureDocument.findMany({ where, orderBy, skip, take }),
      prisma.secureDocument.count({ where }),
    ]);
    return { rows, total };
  }
}
