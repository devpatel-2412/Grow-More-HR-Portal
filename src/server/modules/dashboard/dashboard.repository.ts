import { prisma } from '../../db/prisma.js';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Finds rows whose month/day (birthday, anniversary, ...) falls within the next `days`,
 * wrapping the year forward when the next occurrence has already passed this year (e.g. a
 * December 30 birthday checked on January 2 is 363 days away, not -363).
 */
export function withinNextNDays<T>(rows: T[], getDate: (row: T) => Date, now: Date, days: number): (T & { daysAway: number })[] {
  const today = startOfDay(now);
  return rows
    .map((row) => {
      const date = getDate(row);
      const nextOccurrence = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      if (nextOccurrence < today) nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
      const daysAway = Math.round((nextOccurrence.getTime() - today.getTime()) / 86_400_000);
      return { ...row, daysAway };
    })
    .filter(({ daysAway }) => daysAway >= 0 && daysAway <= days)
    .sort((a, b) => a.daysAway - b.daysAway);
}

export class DashboardRepository {
  async headcount(tenantId: string) {
    const grouped = await prisma.employeeProfile.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const total = grouped.reduce((sum, g) => sum + g._count, 0);
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
    return { total, byStatus };
  }

  async attendanceToday(tenantId: string, now: Date) {
    const day = startOfDay(now);
    const grouped = await prisma.attendance.groupBy({
      by: ['status'],
      where: { tenantId, date: day },
      _count: true,
    });
    return Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  }

  async onLeaveToday(tenantId: string, now: Date) {
    const day = startOfDay(now);
    return prisma.leaveRequest.count({
      where: { tenantId, status: 'APPROVED', startDate: { lte: day }, endDate: { gte: day } },
    });
  }

  async departmentCount(tenantId: string) {
    const grouped = await prisma.employeeProfile.groupBy({ by: ['department'], where: { tenantId } });
    return grouped.length;
  }

  async branchCount(tenantId: string) {
    return prisma.branch.count({ where: { tenantId } });
  }

  async projectCounts(tenantId: string) {
    const grouped = await prisma.project.groupBy({ by: ['status'], where: { tenantId }, _count: true });
    return Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  }

  async pendingTaskCount(tenantId: string) {
    return prisma.task.count({ where: { tenantId, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } } });
  }

  async latestPayrollRun(tenantId: string) {
    return prisma.payrollRun.findFirst({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async revenueThisMonth(tenantId: string, now: Date) {
    const from = startOfMonth(now);
    const to = endOfMonth(now);
    const result = await prisma.financeDocument.aggregate({
      where: { tenantId, type: 'INVOICE', status: { notIn: ['DRAFT', 'VOID'] }, issueDate: { gte: from, lte: to } },
      _sum: { totalAmount: true },
    });
    return result._sum.totalAmount ?? 0;
  }

  /** Employees whose birthday (month/day, any birth year) falls within the next 7 days, including today. */
  async upcomingBirthdays(tenantId: string, now: Date) {
    const employees = await prisma.employeeProfile.findMany({
      where: { tenantId, status: 'ACTIVE', dateOfBirth: { not: null } },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
    });
    return withinNextNDays(employees, (e) => e.dateOfBirth!, now, 7);
  }

  /** Employees whose join-date anniversary (month/day, excluding the join year itself) falls within the next 7 days. */
  async upcomingAnniversaries(tenantId: string, now: Date) {
    const employees = await prisma.employeeProfile.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, dateOfJoining: true },
    });
    return withinNextNDays(
      employees.filter((e) => e.dateOfJoining.getFullYear() < now.getFullYear()),
      (e) => e.dateOfJoining,
      now,
      7,
    );
  }

  async newEmployees(tenantId: string, now: Date, withinDays: number) {
    const since = new Date(now.getTime() - withinDays * 86_400_000);
    return prisma.employeeProfile.findMany({
      where: { tenantId, dateOfJoining: { gte: since } },
      select: { id: true, firstName: true, lastName: true, designation: true, department: true, dateOfJoining: true },
      orderBy: { dateOfJoining: 'desc' },
      take: 10,
    });
  }

  async recentActivity(tenantId: string, take: number) {
    return prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, action: true, targetType: true, createdAt: true, actor: { select: { email: true } } },
    });
  }
}
