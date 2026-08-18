import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class AttendanceRepository {
  findByEmployeeAndDate(employeeId: string, date: Date) {
    return prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
      include: { breaks: true },
    });
  }

  findById(id: string) {
    return prisma.attendance.findUnique({ where: { id }, include: { breaks: true } });
  }

  create(data: Prisma.AttendanceCreateInput) {
    return prisma.attendance.create({ data, include: { breaks: true } });
  }

  update(id: string, data: Prisma.AttendanceUpdateInput) {
    return prisma.attendance.update({ where: { id }, data, include: { breaks: true } });
  }

  createBreak(attendanceId: string, breakIn: Date) {
    return prisma.attendanceBreak.create({ data: { attendanceId, breakIn } });
  }

  findOpenBreak(attendanceId: string) {
    return prisma.attendanceBreak.findFirst({ where: { attendanceId, breakOut: null } });
  }

  closeBreak(breakId: string, breakOut: Date) {
    return prisma.attendanceBreak.update({ where: { id: breakId }, data: { breakOut } });
  }

  async findManyByTenant(
    tenantId: string,
    filter: { employeeId?: string; from?: Date; to?: Date },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.AttendanceWhereInput = {
      tenantId,
      employeeId: filter.employeeId,
      date: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
    };
    // No `include: { breaks: true }` here (unlike the single-record methods above) — the paginated
    // list/history view (AttendanceHistoryTable) only ever renders date/checkIn/checkOut/lateMinutes/
    // overBreakMinutes/status, all of which are stored columns on Attendance itself, computed once at
    // check-in/check-out time (see attendance.service.ts). The full per-break join was dead weight on
    // every page of every list fetch.
    const [rows, total] = await Promise.all([
      prisma.attendance.findMany({ where, orderBy, skip, take }),
      prisma.attendance.count({ where }),
    ]);
    return { rows, total };
  }
}
