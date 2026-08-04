import { AuditRepository, type RecordAuditLogInput, type FindAuditLogsFilter } from './audit.repository.js';
import { logger } from '../../shared/logger.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const AUDIT_SORTABLE_FIELDS = ['createdAt', 'action'] as const;

/**
 * The only entry point any module should use to write an audit trail. Consumed via explicit
 * calls (never a Prisma middleware/global interceptor) so it stays easy to control exactly
 * what gets logged and to keep sensitive payloads (passwords, raw tokens) out of `metadata`.
 *
 * A write failure here must never break the calling request — it is logged and swallowed.
 */
export class AuditLogService {
  constructor(private readonly repository: AuditRepository = new AuditRepository()) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.repository.create(input);
    } catch (err) {
      logger.error({ err, action: input.action }, 'Failed to write audit log entry');
    }
  }

  async list(filter: FindAuditLogsFilter, page: number, limit: number, sort?: string) {
    const orderBy = toPrismaOrderBy(sort, AUDIT_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(filter, orderBy, (page - 1) * limit, limit);
    return { rows, meta: buildPaginationMeta(page, limit, total) };
  }
}

export const auditLogService = new AuditLogService();
