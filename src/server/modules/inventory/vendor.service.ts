import { VendorRepository } from './vendor.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createVendorSchema, updateVendorSchema, listVendorsQuerySchema } from './vendor.validators.js';

const VENDOR_SORTABLE_FIELDS = ['name', 'status', 'createdAt'] as const;

interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class VendorService {
  constructor(private readonly repository: VendorRepository = new VendorRepository()) {}

  async create(tenantId: string, input: z.infer<typeof createVendorSchema>, meta: RequestMeta) {
    const existing = await this.repository.findByName(tenantId, input.name);
    if (existing) throw new ConflictError('A vendor with this name already exists');

    const vendor = await this.repository.create({ tenant: { connect: { id: tenantId } }, ...input });
    await this.audit(tenantId, meta, 'VENDOR_CREATED', vendor.id);
    return vendor;
  }

  async requireVendor(tenantId: string, id: string) {
    const vendor = await this.repository.findById(id);
    if (!vendor || vendor.tenantId !== tenantId) throw new NotFoundError('Vendor not found');
    return vendor;
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateVendorSchema>, meta: RequestMeta) {
    await this.requireVendor(tenantId, id);
    if (input.name) {
      const existing = await this.repository.findByName(tenantId, input.name);
      if (existing && existing.id !== id) throw new ConflictError('A vendor with this name already exists');
    }

    const updated = await this.repository.update(id, input);
    await this.audit(tenantId, meta, 'VENDOR_UPDATED', id);
    return updated;
  }

  /** A vendor still listed as a preferred supplier on inventory items can't be deleted out from under them. */
  async delete(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireVendor(tenantId, id);
    const itemCount = await this.repository.countInventoryItems(id);
    if (itemCount > 0) throw new ConflictError('Cannot delete a vendor that supplies inventory items');

    await this.repository.delete(id);
    await this.audit(tenantId, meta, 'VENDOR_DELETED', id);
  }

  async list(tenantId: string, query: z.infer<typeof listVendorsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, VENDOR_SORTABLE_FIELDS, { field: 'name', direction: 'asc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { status: query.status, search: query.search },
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
      targetType: 'Vendor',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const vendorService = new VendorService();
