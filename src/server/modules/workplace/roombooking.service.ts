import { RoomBookingRepository } from './roombooking.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';

import type { z } from 'zod';
import type { createRoomBookingSchema, listRoomBookingsQuerySchema } from './roombooking.validators.js';
const ROOM_BOOKING_SORTABLE_FIELDS = ['roomName', 'startTime', 'endTime', 'status'] as const;

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class RoomBookingService {
  constructor(
    private readonly repository: RoomBookingRepository = new RoomBookingRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  private async requireOwnProfile(userId: string) {
    const profile = await this.employeeRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('No employee profile is associated with this account');
    return profile;
  }

  async create(tenantId: string, userId: string, input: z.infer<typeof createRoomBookingSchema>, meta: RequestMeta) {
    const profile = await this.requireOwnProfile(userId);

    const conflict = await this.repository.findOverlapping(tenantId, input.roomName, input.startTime, input.endTime);
    if (conflict) throw new ConflictError('This room is already booked for part of that time');

    const booking = await this.repository.create({
      tenant: { connect: { id: tenantId } },
      employee: { connect: { id: profile.id } },
      ...input,
    });
    await this.audit(tenantId, meta, 'ROOM_BOOKING_CREATED', booking.id);
    return booking;
  }

  async requireBooking(tenantId: string, id: string) {
    const booking = await this.repository.findById(id);
    if (!booking || booking.tenantId !== tenantId) throw new NotFoundError('Booking not found');
    return booking;
  }

  /** The booker may always cancel their own booking; anyone with ROOM_BOOKING_MANAGE can cancel any booking (e.g. to free a room for a higher-priority need). */
  async cancel(tenantId: string, userId: string, hasManagePermission: boolean, id: string, meta: RequestMeta) {
    const booking = await this.requireBooking(tenantId, id);
    if (booking.status === 'CANCELLED') throw new ConflictError('This booking is already cancelled');

    if (!hasManagePermission) {
      const profile = await this.requireOwnProfile(userId);
      if (booking.employeeId !== profile.id) throw new ForbiddenError('You can only cancel your own bookings');
    }

    const updated = await this.repository.update(id, { status: 'CANCELLED' });
    await this.audit(tenantId, meta, 'ROOM_BOOKING_CANCELLED', id);
    return updated;
  }

  async list(tenantId: string, query: z.infer<typeof listRoomBookingsQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, ROOM_BOOKING_SORTABLE_FIELDS, { field: 'startTime', direction: 'asc' });
    const { rows, total } = await this.repository.findMany(
      tenantId,
      { roomName: query.roomName, from: query.from, to: query.to },
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
      targetType: 'RoomBooking',
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const roomBookingService = new RoomBookingService();
