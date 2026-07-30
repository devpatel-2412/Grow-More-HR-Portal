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
    skip: number,
    take: number,
  ) {
    const where: Prisma.AttendanceWhereInput = {
      tenantId,
      employeeId: filter.employeeId,
      date: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.attendance.findMany({ where, orderBy: { date: 'desc' }, skip, take, include: { breaks: true } }),
      prisma.attendance.count({ where }),
    ]);
    return { rows, total };
  }
}
