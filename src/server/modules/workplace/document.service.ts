import { DocumentRepository } from './document.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { NotFoundError, ConflictError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

import type { z } from 'zod';
import type { createDocumentSchema, replaceDocumentFileSchema, listDocumentsQuerySchema } from './document.validators.js';
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

  async upload(tenantId: string, userId: string, input: z.infer<typeof createDocumentSchema>, meta: RequestMeta) {
    const uploader = await this.employeeRepository.findByUserId(userId);
    const { fileUrl, ...rest } = input;
    const document = await this.repository.create(tenantId, fileUrl, uploader?.id, {
      uploadedBy: uploader ? { connect: { id: uploader.id } } : undefined,
      ...rest,
    });
    await this.audit(tenantId, meta, 'DOCUMENT_UPLOADED', document.id);
    return document;
  }

  async requireDocument(tenantId: string, id: string) {
    const document = await this.repository.findById(id);
    if (!document || document.tenantId !== tenantId) throw new NotFoundError('Document not found');
    return document;
  }

  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireDocument(tenantId, id);
    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'DOCUMENT_DELETED', id);
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

  async replaceFile(
    tenantId: string,
    userId: string,
    id: string,
    input: z.infer<typeof replaceDocumentFileSchema>,
    meta: RequestMeta,
  ) {
    await this.requireDocument(tenantId, id);
    const uploader = await this.employeeRepository.findByUserId(userId);
    const document = await this.repository.replaceFile(id, input.fileUrl, tenantId, uploader?.id);
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
      { folderPath: query.folderPath, category: query.category, search: query.search, archived: query.archived },
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
