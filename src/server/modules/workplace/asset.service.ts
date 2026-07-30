import { AssetRepository } from './asset.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import type { AssetStatus } from '@prisma/client';
import type { z } from 'zod';
import type { createAssetSchema, listAssetsQuerySchema } from './asset.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AssetService {
  constructor(
    private readonly repository: AssetRepository = new AssetRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  async create(tenantId: string, input: z.infer<typeof createAssetSchema>, meta: RequestMeta) {
    const existing = await this.repository.findBySerial(tenantId, input.serialNumber);
    if (existing) throw new ConflictError('An asset with this serial number already exists');

    const asset = await this.repository.create({ tenant: { connect: { id: tenantId } }, status: 'AVAILABLE', ...input });
    await this.audit(tenantId, meta, 'ASSET_CREATED', asset.id);
    return asset;
  }

  async requireAsset(tenantId: string, id: string) {
    const asset = await this.repository.findById(id);
    if (!asset || asset.tenantId !== tenantId) throw new NotFoundError('Asset not found');
    return asset;
  }

  /** Only an available asset can be handed out — one already assigned or under repair must be freed up first. */
  async assign(tenantId: string, id: string, employeeId: string, meta: RequestMeta) {
    const asset = await this.requireAsset(tenantId, id);
    if (asset.status !== 'AVAILABLE') {
      throw new ConflictError(`An asset that is ${asset.status.toLowerCase()} cannot be assigned`);
    }

    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee || employee.tenantId !== tenantId) throw new NotFoundError('Employee not found');

    const updated = await this.repository.update(id, {
      status: 'ASSIGNED',
      employee: { connect: { id: employeeId } },
      assignedAt: new Date(),
    });
    await this.audit(tenantId, meta, 'ASSET_ASSIGNED', id);
    return updated;
  }

  async unassign(tenantId: string, id: string, meta: RequestMeta) {
    const asset = await this.requireAsset(tenantId, id);
    if (asset.status !== 'ASSIGNED') throw new ConflictError('This asset is not currently assigned');

    const updated = await this.repository.update(id, {
      status: 'AVAILABLE',
      employee: { disconnect: true },
      assignedAt: null,
    });
    await this.audit(tenantId, meta, 'ASSET_UNASSIGNED', id);
    return updated;
  }

  /**
   * UNDER_REPAIR and RETIRED both take the asset out of an employee's hands, so moving into
   * either state also clears the assignment — an asset cannot be "in repair" and "with an
   * employee" at once. RETIRED is terminal; nothing here can move an asset back out of it.
   */
  async changeStatus(tenantId: string, id: string, status: AssetStatus, meta: RequestMeta) {
    const asset = await this.requireAsset(tenantId, id);
    if (asset.status === 'RETIRED') throw new ConflictError('A retired asset cannot change status');
    if (asset.status === status) throw new ConflictError(`Asset is already ${status.toLowerCase()}`);

    const clearsAssignment = status === 'UNDER_REPAIR' || status === 'RETIRED';
    const updated = await this.repository.update(id, {
      status,
      employee: clearsAssignment ? { disconnect: true } : undefined,
      assignedAt: clearsAssignment ? null : undefined,
    });
    await this.audit(tenantId, meta, 'ASSET_STATUS_CHANGED', id);
    return updated;
  }

  async list(
    tenantId: string,
    requester: { userId: string; canReadTenant: boolean },
    query: z.infer<typeof listAssetsQuerySchema>,
  ) {
    let employeeId = query.employeeId;
    if (!requester.canReadTenant) {
      const own = await this.employeeRepository.findByUserId(requester.userId);
      employeeId = own?.id ?? '__none__';
    }

    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, type: query.type, employeeId },
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
      targetType: 'Asset',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const assetService = new AssetService();
