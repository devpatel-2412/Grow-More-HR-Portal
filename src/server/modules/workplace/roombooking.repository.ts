import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class RoomBookingRepository {
  create(data: Prisma.RoomBookingCreateInput) {
    return prisma.roomBooking.create({ data });
  }

  findById(id: string) {
    return prisma.roomBooking.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.RoomBookingUpdateInput) {
    return prisma.roomBooking.update({ where: { id }, data });
  }

  /** Confirmed bookings for the room whose window overlaps [startTime, endTime). */
  findOverlapping(tenantId: string, roomName: string, startTime: Date, endTime: Date, excludeId?: string) {
    return prisma.roomBooking.findFirst({
      where: {
        tenantId,
        roomName,
        status: 'CONFIRMED',
        id: excludeId ? { not: excludeId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  async findMany(tenantId: string, filter: { roomName?: string; from?: Date; to?: Date }, skip: number, take: number) {
    const where: Prisma.RoomBookingWhereInput = {
      tenantId,
      roomName: filter.roomName,
      startTime: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.roomBooking.findMany({ where, orderBy: { startTime: 'asc' }, skip, take }),
      prisma.roomBooking.count({ where }),
    ]);
    return { rows, total };
  }
}
