import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export interface StoredFileMeta {
  storageKey: string;
  fileSize: number;
  mimeType: string;
}

export class DocumentRepository {
  /** Also creates the version-1 history row, so a document's version history is always complete from the start. */
  create(
    tenantId: string,
    file: StoredFileMeta,
    uploadedById: string | undefined,
    data: Omit<Prisma.SecureDocumentCreateInput, 'tenant' | 'storageKey' | 'fileSize' | 'mimeType'>,
  ) {
    return prisma.secureDocument.create({
      data: {
        ...data,
        storageKey: file.storageKey,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        tenant: { connect: { id: tenantId } },
        versions: {
          create: {
            tenant: { connect: { id: tenantId } },
            version: 1,
            storageKey: file.storageKey,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
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

  /** Bumps to the next version and appends a history row — the prior file stays intact in its own DocumentVersion row. */
  async replaceFile(id: string, file: StoredFileMeta, tenantId: string, uploadedById: string | undefined) {
    const current = await prisma.secureDocument.findUniqueOrThrow({ where: { id } });
    const nextVersion = current.version + 1;
    const [document] = await prisma.$transaction([
      prisma.secureDocument.update({
        where: { id },
        data: { storageKey: file.storageKey, fileSize: file.fileSize, mimeType: file.mimeType, version: nextVersion },
      }),
      prisma.documentVersion.create({
        data: {
          tenant: { connect: { id: tenantId } },
          document: { connect: { id } },
          version: nextVersion,
          storageKey: file.storageKey,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
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

  findVersionById(versionId: string) {
    return prisma.documentVersion.findUnique({ where: { id: versionId } });
  }

  /** Every storage key ever written for this document (current + every prior version) — used to
   * clean up the bucket when the document is permanently deleted, not just its DB rows. */
  async findAllStorageKeys(documentId: string): Promise<string[]> {
    const versions = await prisma.documentVersion.findMany({ where: { documentId }, select: { storageKey: true } });
    return versions.map((v) => v.storageKey).filter((key): key is string => !!key);
  }

  async findMany(
    tenantId: string,
    filter: {
      folderPath?: string;
      category?: string;
      search?: string;
      archived: boolean;
      relatedEntityType?: string;
      relatedEntityId?: string;
    },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.SecureDocumentWhereInput = {
      tenantId,
      folderPath: filter.folderPath,
      category: filter.category,
      archived: filter.archived,
      relatedEntityType: filter.relatedEntityType,
      relatedEntityId: filter.relatedEntityId,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.secureDocument.findMany({ where, orderBy, skip, take }),
      prisma.secureDocument.count({ where }),
    ]);
    return { rows, total };
  }
}
