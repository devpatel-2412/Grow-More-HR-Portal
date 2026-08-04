import { DashboardRepository } from './dashboard.repository.js';

export class DashboardService {
  constructor(private readonly repository: DashboardRepository = new DashboardRepository()) {}

  async getAdminSummary(tenantId: string) {
    const now = new Date();

    const [
      headcount,
      attendanceToday,
      onLeaveToday,
      departmentCount,
      branchCount,
      projectCounts,
      pendingTaskCount,
      latestPayrollRun,
      revenueThisMonth,
      birthdays,
      anniversaries,
      newEmployees,
      recentActivity,
    ] = await Promise.all([
      this.repository.headcount(tenantId),
      this.repository.attendanceToday(tenantId, now),
      this.repository.onLeaveToday(tenantId, now),
      this.repository.departmentCount(tenantId),
      this.repository.branchCount(tenantId),
      this.repository.projectCounts(tenantId),
      this.repository.pendingTaskCount(tenantId),
      this.repository.latestPayrollRun(tenantId),
      this.repository.revenueThisMonth(tenantId, now),
      this.repository.upcomingBirthdays(tenantId, now),
      this.repository.upcomingAnniversaries(tenantId, now),
      this.repository.newEmployees(tenantId, now, 30),
      this.repository.recentActivity(tenantId, 10),
    ]);

    return {
      headcount: {
        total: headcount.total,
        active: headcount.byStatus.ACTIVE ?? 0,
        onboarding: headcount.byStatus.ONBOARDING ?? 0,
        offboarding: headcount.byStatus.OFFBOARDING ?? 0,
      },
      attendanceToday: {
        present: attendanceToday.PRESENT ?? 0,
        absent: attendanceToday.ABSENT ?? 0,
        late: attendanceToday.LATE ?? 0,
        halfDay: attendanceToday.HALFDAY ?? 0,
        onLeave: onLeaveToday,
      },
      departmentCount,
      branchCount,
      projects: {
        active: (projectCounts.PLANNING ?? 0) + (projectCounts.IN_PROGRESS ?? 0),
        onHold: projectCounts.ON_HOLD ?? 0,
        completed: projectCounts.COMPLETED ?? 0,
      },
      pendingTaskCount,
      payroll: latestPayrollRun
        ? {
            month: latestPayrollRun.month,
            year: latestPayrollRun.year,
            status: latestPayrollRun.status,
            totalNet: latestPayrollRun.totalNet,
            itemCount: latestPayrollRun.itemCount,
          }
        : null,
      revenueThisMonth,
      birthdays,
      anniversaries,
      newEmployees,
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        action: entry.action,
        targetType: entry.targetType,
        createdAt: entry.createdAt,
        actorEmail: entry.actor?.email ?? null,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
