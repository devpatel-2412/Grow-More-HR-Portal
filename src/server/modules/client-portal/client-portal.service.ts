import { UserRepository } from '../users/user.repository.js';
import { ClientRepository } from '../crm/crm.repository.js';
import { FinanceRepository } from '../finance/finance.repository.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { listOwnFinanceDocumentsQuerySchema, listOwnProjectsQuerySchema } from './client-portal.validators.js';

const FINANCE_SORTABLE_FIELDS = ['number', 'issueDate', 'dueDate', 'totalAmount', 'status'] as const;
const PROJECT_SORTABLE_FIELDS = ['name', 'startDate', 'status'] as const;

export class ClientPortalService {
  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly clientRepository: ClientRepository = new ClientRepository(),
    private readonly financeRepository: FinanceRepository = new FinanceRepository(),
    private readonly projectRepository: ProjectRepository = new ProjectRepository(),
  ) {}

  /** A CLIENT-role login with no linked ClientPortal shouldn't exist, but a stray staff account hitting these routes must never see anyone's data. */
  private async resolveOwnClientPortalId(tenantId: string, userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.tenantId !== tenantId || user.role !== 'CLIENT' || !user.clientProfileId) {
      throw new ForbiddenError('This account is not linked to a client portal');
    }
    return user.clientProfileId;
  }

  async getOwnProfile(tenantId: string, userId: string) {
    const clientPortalId = await this.resolveOwnClientPortalId(tenantId, userId);
    const client = await this.clientRepository.findWithDetail(clientPortalId);
    if (!client) throw new NotFoundError('Client profile not found');
    return client;
  }

  async listOwnFinanceDocuments(tenantId: string, userId: string, query: z.infer<typeof listOwnFinanceDocumentsQuerySchema>) {
    const clientPortalId = await this.resolveOwnClientPortalId(tenantId, userId);
    const orderBy = toPrismaOrderBy(query.sort, FINANCE_SORTABLE_FIELDS, { field: 'issueDate', direction: 'desc' });
    const { rows, total } = await this.financeRepository.findMany(
      tenantId,
      { type: query.type, status: query.status, clientPortalId },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );

    // Same read-time OVERDUE projection the staff-facing finance list applies — a SENT document past its due date.
    const now = new Date();
    const withOverdue = rows.map((row) =>
      row.status === 'SENT' && row.dueDate && row.dueDate < now ? { ...row, status: 'OVERDUE' as const } : row,
    );

    return { rows: withOverdue, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getOwnFinanceDocument(tenantId: string, userId: string, id: string) {
    const clientPortalId = await this.resolveOwnClientPortalId(tenantId, userId);
    const document = await this.financeRepository.findWithDetail(id);
    if (!document || document.clientPortalId !== clientPortalId) throw new NotFoundError('Document not found');
    return document;
  }

  async listOwnProjects(tenantId: string, userId: string, query: z.infer<typeof listOwnProjectsQuerySchema>) {
    const clientPortalId = await this.resolveOwnClientPortalId(tenantId, userId);
    const orderBy = toPrismaOrderBy(query.sort, PROJECT_SORTABLE_FIELDS, { field: 'startDate', direction: 'desc' });
    const { rows, total } = await this.projectRepository.findMany(
      tenantId,
      { status: query.status, clientPortalId },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const clientPortalService = new ClientPortalService();
