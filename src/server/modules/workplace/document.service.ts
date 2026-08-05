import { DocumentRepository } from './document.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { storageService, type UploadedFileInput } from '../../shared/storage/storage.service.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import { logger } from '../../shared/logger.js';

import type { z } from 'zod';
import type { createDocumentSchema, listDocumentsQuerySchema } from './document.validators.js';
const DOCUMENT_SORTABLE_FIELDS = ['name', 'folderPath', 'expiresAt', 'createdAt'] as const;

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository = new DocumentRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  /** One SecureDocument per file — each keeps its own original filename as `name`, sharing the
   * rest of the batch's metadata (category, folderPath, expiry, related-entity link). */
  async upload(
    tenantId: string,
    userId: string,
    files: UploadedFileInput[],
    input: z.infer<typeof createDocumentSchema>,
    meta: RequestMeta,
  ) {
    const uploader = await this.employeeRepository.findByUserId(userId);
    const documents = [];
    for (const file of files) {
      const stored = await storageService.upload(tenantId, input.category, file);
      const document = await this.repository.create(
        tenantId,
        { ...stored, mimeType: file.mimeType },
        uploader?.id,
        {
          name: file.fileName,
          category: input.category,
          folderPath: input.folderPath,
          expiresAt: input.expiresAt,
          isDigitallySigned: input.isDigitallySigned,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          uploadedBy: uploader ? { connect: { id: uploader.id } } : undefined,
        },
      );
      documents.push(document);
      await this.audit(tenantId, meta, 'DOCUMENT_UPLOADED', document.id);
    }
    return documents;
  }

  async requireDocument(tenantId: string, id: string) {
    const document = await this.repository.findById(id);
    if (!document || document.tenantId !== tenantId) throw new NotFoundError('Document not found');
    return document;
  }

  /** A fresh signed URL for a real upload, or the raw external link for a legacy pasted-URL
   * document — never a persisted long-lived URL either way. */
  async getDownloadUrl(tenantId: string, id: string, meta: RequestMeta) {
    const document = await this.requireDocument(tenantId, id);
    await this.audit(tenantId, meta, 'DOCUMENT_DOWNLOADED', id);
    if (document.storageKey) {
      return { url: await storageService.getSignedDownloadUrl(document.storageKey), fileName: document.name };
    }
    if (document.fileUrl) {
      return { url: document.fileUrl, fileName: document.name };
    }
    throw new NotFoundError('This document has no file associated with it');
  }

  /** Same shape as getDownloadUrl but for one specific historical version rather than the
   * document's current file — each DocumentVersion keeps its own storageKey/fileUrl forever. */
  async getVersionDownloadUrl(tenantId: string, documentId: string, versionId: string, meta: RequestMeta) {
    const document = await this.requireDocument(tenantId, documentId);
    const version = await this.repository.findVersionById(versionId);
    if (!version || version.tenantId !== tenantId || version.documentId !== documentId) {
      throw new NotFoundError('Document version not found');
    }
    await this.audit(tenantId, meta, 'DOCUMENT_DOWNLOADED', documentId);
    const fileName = `${document.name} (v${version.version})`;
    if (version.storageKey) {
      return { url: await storageService.getSignedDownloadUrl(version.storageKey), fileName };
    }
    if (version.fileUrl) {
      return { url: version.fileUrl, fileName };
    }
    throw new NotFoundError('This version has no file associated with it');
  }

  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireDocument(tenantId, id);
    const storageKeys = await this.repository.findAllStorageKeys(id);
    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'DOCUMENT_DELETED', id);
    // Best-effort: the document is already gone from the app's perspective either way, and a
    // stray object left in the bucket costs storage, not correctness — never block the user on this.
    await Promise.all(
      storageKeys.map((key) =>
        storageService.delete(key).catch((err) => logger.warn({ err, storageKey: key }, 'Failed to delete storage object')),
      ),
    );
  }

  async archive(tenantId: string, id: string, meta: RequestMeta) {
    const document = await this.requireDocument(tenantId, id);
    if (document.archived) throw new ConflictError('This document is already archived');
    const archived = await this.repository.archive(id);
    await this.audit(tenantId, meta, 'DOCUMENT_ARCHIVED', id);
    return archived;
  }

  async restore(tenantId: string, id: string, meta: RequestMeta) {
    const document = await this.requireDocument(tenantId, id);
    if (!document.archived) throw new ConflictError('This document is not archived');
    const restored = await this.repository.restore(id);
    await this.audit(tenantId, meta, 'DOCUMENT_RESTORED', id);
    return restored;
  }

  async replaceFile(tenantId: string, userId: string, id: string, file: UploadedFileInput, meta: RequestMeta) {
    const existing = await this.requireDocument(tenantId, id);
    const uploader = await this.employeeRepository.findByUserId(userId);
    const stored = await storageService.upload(tenantId, existing.category ?? undefined, file);
    const document = await this.repository.replaceFile(id, { ...stored, mimeType: file.mimeType }, tenantId, uploader?.id);
    await this.audit(tenantId, meta, 'DOCUMENT_VERSION_REPLACED', id);
    return document;
  }

  async listVersions(tenantId: string, id: string) {
    await this.requireDocument(tenantId, id);
    return this.repository.findVersions(id);
  }

  async list(tenantId: string, query: z.infer<typeof listDocumentsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, DOCUMENT_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      {
        folderPath: query.folderPath,
        category: query.category,
        search: query.search,
        archived: query.archived,
        relatedEntityType: query.relatedEntityType,
        relatedEntityId: query.relatedEntityId,
      },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private audit(
    tenantId: string,
    meta: RequestMeta,
    action: Parameters<typeof auditLogService.record>[0]['action'],
    targetId: string,
  ) {
    return auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action,
      targetType: 'SecureDocument',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const documentService = new DocumentService();
