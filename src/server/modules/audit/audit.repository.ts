import type { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';

export interface RecordAuditLogInput {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface FindAuditLogsFilter {
  tenantId?: string;
  actorUserId?: string;
  action?: AuditAction | AuditAction[];
  from?: Date;
  to?: Date;
}

export class AuditRepository {
  create(input: RecordAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata,
      },
    });
  }

  async findMany(filter: FindAuditLogsFilter, orderBy: Record<string, 'asc' | 'desc'>, skip: number, take: number) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: filter.tenantId,
      actorUserId: filter.actorUserId,
      action: Array.isArray(filter.action) ? { in: filter.action } : filter.action,
      createdAt:
        filter.from || filter.to
          ? { gte: filter.from, lte: filter.to }
          : undefined,
    };

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { rows, total };
  }
}
