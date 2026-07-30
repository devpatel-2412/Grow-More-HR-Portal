import { DocumentRepository } from './document.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createDocumentSchema, listDocumentsQuerySchema } from './document.validators.js';

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
    const document = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      uploadedBy: uploader ? { connect: { id: uploader.id } } : undefined,
      ...input,
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

  async list(tenantId: string, query: z.infer<typeof listDocumentsQuerySchema>) {
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { folderPath: query.folderPath, search: query.search },
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
