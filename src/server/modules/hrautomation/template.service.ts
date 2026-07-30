import { TemplateRepository, GeneratedDocumentRepository } from './template.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { renderBody, resolveField, buildVariables } from './template.renderer.js';
import { isPosterType } from './template.validators.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  generateDocumentSchema,
} from './template.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TemplateService {
  constructor(
    private readonly repository: TemplateRepository = new TemplateRepository(),
    private readonly documentRepository: GeneratedDocumentRepository = new GeneratedDocumentRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
    private readonly tenantRepository: TenantRepository = new TenantRepository(),
  ) {}

  async create(tenantId: string, createdByEmployeeId: string | undefined, input: z.infer<typeof createTemplateSchema>, meta: RequestMeta) {
    const template = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      createdBy: createdByEmployeeId ? { connect: { id: createdByEmployeeId } } : undefined,
      ...input,
    });
    await this.audit(tenantId, meta, 'TEMPLATE_CREATED', template.id);
    return template;
  }

  async requireTemplate(tenantId: string, id: string) {
    const template = await this.repository.findById(id);
    if (!template || template.tenantId !== tenantId) throw new NotFoundError('Template not found');
    return template;
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateTemplateSchema>, meta: RequestMeta) {
    await this.requireTemplate(tenantId, id);
    // Prisma's JSON columns need the sentinel Prisma.JsonNull to actually clear the field to
    // SQL NULL — passing plain `null` through the generated input type is a compile error.
    const { layoutFields, ...rest } = input;
    const updated = await this.repository.update(id, {
      ...rest,
      layoutFields: layoutFields === undefined ? undefined : layoutFields === null ? Prisma.JsonNull : layoutFields,
    });
    await this.audit(tenantId, meta, 'TEMPLATE_UPDATED', id);
    return updated;
  }

  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireTemplate(tenantId, id);
    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'TEMPLATE_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listTemplatesQuerySchema>) {
    const { rows, total } = await this.repository.findMany(tenantId, { type: query.type }, (query.page - 1) * query.limit, query.limit);
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /**
   * Fills a template with a real employee's data. Letters render their body text; posters
   * resolve each layout field to a value, leaving the actual pixel compositing (an image export)
   * to the frontend/print step — no image-generation library is wired in here.
   */
  async generate(
    tenantId: string,
    generatedByUserId: string | undefined,
    templateId: string,
    input: z.infer<typeof generateDocumentSchema>,
    meta: RequestMeta,
  ) {
    const template = await this.requireTemplate(tenantId, templateId);

    const employee = await this.employeeRepository.findById(input.employeeId);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Employee not found');

    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant not found');

    const variables = buildVariables(employee, tenant.name);

    const renderedContent = isPosterType(template.type)
      ? JSON.stringify(
          ((template.layoutFields as { id: string; variableKey: string; x: number; y: number }[] | null) ?? []).map((field) => ({
            ...field,
            text: resolveField(field.variableKey, variables),
          })),
        )
      : renderBody(template.bodyTemplate ?? '', variables);

    const generatedByEmployee = generatedByUserId ? await this.employeeRepository.findByUserId(generatedByUserId) : null;

    const document = await this.documentRepository.create({
      tenant: { connect: { id: tenantId } },
      template: { connect: { id: templateId } },
      employee: { connect: { id: input.employeeId } },
      variablesJson: variables satisfies Prisma.InputJsonValue,
      renderedContent,
      generatedBy: generatedByEmployee ? { connect: { id: generatedByEmployee.id } } : undefined,
    });

    await this.audit(tenantId, meta, 'DOCUMENT_GENERATED', document.id);
    return document;
  }

  async listGeneratedDocuments(
    tenantId: string,
    query: { page: number; limit: number; employeeId?: string; templateId?: string },
  ) {
    const { rows, total } = await this.documentRepository.findMany(
      tenantId,
      { employeeId: query.employeeId, templateId: query.templateId },
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
      targetType: 'CanvaTemplate',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const templateService = new TemplateService();
