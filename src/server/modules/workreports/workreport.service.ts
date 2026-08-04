import { WorkReportRepository, type WorkReportFilter } from './workreport.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

const WORK_REPORT_SORTABLE_FIELDS = ['date', 'status', 'timeSpentMinutes'] as const;
import { prisma } from '../../db/prisma.js';
import type { z } from 'zod';
import type { submitWorkReportSchema, updateWorkReportSchema, listWorkReportQuerySchema } from './workreport.validators.js';

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** `date` is a DATE column — normalising to UTC midnight keeps the one-report-per-day unique key stable across client timezones. */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export class WorkReportService {
  constructor(
    private readonly repository: WorkReportRepository = new WorkReportRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireEmployeeProfile(userId: string) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');
    return profile;
  }

  async submit(userId: string, tenantId: string, input: z.infer<typeof submitWorkReportSchema>, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);
    const date = toDateOnly(input.date);

    const existing = await this.repository.findByEmployeeAndDate(profile.id, date);
    if (existing) throw new ConflictError('You have already submitted a work report for this date');

    const record = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: profile.id } },
      date,
      completedTasks: input.completedTasks,
      pendingTasks: input.pendingTasks,
      tomorrowPlan: input.tomorrowPlan,
      issues: input.issues,
      timeSpentMinutes: input.timeSpentMinutes,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'WORK_REPORT_SUBMITTED',
      targetType: 'DailyWorkReport',
      targetId: record.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  }

  /** Own report, editable only while still PENDING — once reviewed the record is the reviewer's evidence and must not shift under them. */
  async update(userId: string, tenantId: string, id: string, input: z.infer<typeof updateWorkReportSchema>, meta: RequestMeta) {
    const profile = await this.requireEmployeeProfile(userId);
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Work report not found');
    if (record.employeeId !== profile.id) throw new ForbiddenError('You can only edit your own work reports');
    if (record.status !== 'PENDING') throw new ConflictError('A reviewed work report can no longer be edited');

    const updated = await this.repository.update(id, input);

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: 'WORK_REPORT_UPDATED',
      targetType: 'DailyWorkReport',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  /**
   * Reviewers are either the employee's own manager (an org-chart fact) or anyone holding
   * WORK_REPORT_REVIEW — same ownership-vs-permission split used for leave and regularizations.
   */
  async review(
    userId: string,
    tenantId: string,
    id: string,
    input: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
    hasReviewPermission: boolean,
    meta: RequestMeta,
  ) {
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Work report not found');
    if (record.status !== 'PENDING') throw new ConflictError('This work report has already been reviewed');

    const reviewer = await this.requireEmployeeProfile(userId);
    if (reviewer.id === record.employeeId) throw new ForbiddenError('You cannot review your own work report');

    if (!hasReviewPermission) {
      const author = await this.employeeRepository.findById(record.employeeId);
      if (author?.managerId !== reviewer.id) throw new ForbiddenError('You are not the manager for this employee');
    }

    const updated = await this.repository.update(id, {
      status: input.status,
      reviewedBy: { connect: { id: reviewer.id } },
      reviewedAt: new Date(),
      reviewNote: input.reviewNote,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action: input.status === 'APPROVED' ? 'WORK_REPORT_APPROVED' : 'WORK_REPORT_REJECTED',
      targetType: 'DailyWorkReport',
      targetId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  }

  async getById(tenantId: string, id: string, requester: { userId: string; canReadTenant: boolean }) {
    const record = await this.repository.findById(id);
    if (!record || record.tenantId !== tenantId) throw new NotFoundError('Work report not found');

    if (!requester.canReadTenant) {
      const profile = await this.employeeRepository.findByUserId(requester.userId);
      const isOwner = profile?.id === record.employeeId;
      const author = isOwner ? null : await this.employeeRepository.findById(record.employeeId);
      const isManager = !!profile && author?.managerId === profile.id;
      if (!isOwner && !isManager) throw new ForbiddenError("Cannot view another employee's work report");
    }

    return record;
  }

  async list(
    tenantId: string,
    requester: { userId: string; canReadTenant: boolean },
    query: z.infer<typeof listWorkReportQuerySchema>,
  ) {
    const filter: WorkReportFilter = { status: query.status, from: query.from, to: query.to };

    if (requester.canReadTenant) {
      filter.employeeId = query.employeeId;
    } else {
      const own = await this.requireEmployeeProfile(requester.userId);
      if (query.employeeId && query.employeeId !== own.id) {
        const target = await this.employeeRepository.findById(query.employeeId);
        if (target?.managerId !== own.id) throw new ForbiddenError("Cannot view another employee's work reports");
        filter.employeeId = query.employeeId;
      } else {
        filter.employeeId = own.id;
      }
    }

    const orderBy = toPrismaOrderBy(query.sort, WORK_REPORT_SORTABLE_FIELDS, { field: 'date', direction: 'desc' });
    const { rows, total } = await this.repository.findMany(tenantId, filter, orderBy, (query.page - 1) * query.limit, query.limit);
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  /** Pending reports the caller is responsible for: their direct reports', plus tenant-wide if they hold the review permission. */
  async listReviewQueue(tenantId: string, userId: string, canReviewTenant: boolean, page: number, limit: number) {
    const profile = await this.employeeRepository.findByUserId(userId);

    const where = canReviewTenant
      ? { tenantId, status: 'PENDING' as const, employeeId: { not: profile?.id } }
      : { tenantId, status: 'PENDING' as const, employee: { managerId: profile?.id ?? '__none__' } };

    const [rows, total] = await Promise.all([
      prisma.dailyWorkReport.findMany({ where, orderBy: { date: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.dailyWorkReport.count({ where }),
    ]);

    return { rows, meta: buildPaginationMeta(page, limit, total) };
  }
}

export const workReportService = new WorkReportService();
