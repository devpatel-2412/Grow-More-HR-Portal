import { KbRepository } from './kb.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createArticleSchema, updateArticleSchema, listArticlesQuerySchema } from './kb.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class KbService {
  constructor(
    private readonly repository: KbRepository = new KbRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async create(tenantId: string, userId: string, input: z.infer<typeof createArticleSchema>, meta: RequestMeta) {
    const author = await this.employeeRepository.findByUserId(userId);
    if (!author) throw new NotFoundError('No employee profile is associated with this account');

    const article = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      author: { connect: { id: author.id } },
      ...input,
    });
    await this.audit(tenantId, meta, 'KB_ARTICLE_CREATED', article.id);
    return article;
  }

  async requireArticle(tenantId: string, id: string) {
    const article = await this.repository.findById(id);
    if (!article || article.tenantId !== tenantId) throw new NotFoundError('Article not found');
    return article;
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateArticleSchema>, meta: RequestMeta) {
    await this.requireArticle(tenantId, id);
    const updated = await this.repository.update(id, input);
    await this.audit(tenantId, meta, 'KB_ARTICLE_UPDATED', id);
    return updated;
  }

  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireArticle(tenantId, id);
    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'KB_ARTICLE_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listArticlesQuerySchema>) {
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { category: query.category, search: query.search },
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
      targetType: 'KnowledgeBaseArticle',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const kbService = new KbService();
