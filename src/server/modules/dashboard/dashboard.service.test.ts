import { describe, it, expect, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';

function makeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    headcount: vi.fn().mockResolvedValue({ total: 10, byStatus: { ACTIVE: 8, ONBOARDING: 2 } }),
    attendanceToday: vi.fn().mockResolvedValue({ PRESENT: 6, LATE: 1 }),
    onLeaveToday: vi.fn().mockResolvedValue(2),
    departmentCount: vi.fn().mockResolvedValue(3),
    branchCount: vi.fn().mockResolvedValue(2),
    projectCounts: vi.fn().mockResolvedValue({ PLANNING: 1, IN_PROGRESS: 4, COMPLETED: 5 }),
    pendingTaskCount: vi.fn().mockResolvedValue(12),
    latestPayrollRun: vi.fn().mockResolvedValue(null),
    revenueThisMonth: vi.fn().mockResolvedValue(50000),
    upcomingBirthdays: vi.fn().mockResolvedValue([]),
    upcomingAnniversaries: vi.fn().mockResolvedValue([]),
    newEmployees: vi.fn().mockResolvedValue([]),
    recentActivity: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('DashboardService.getAdminSummary', () => {
  it('shapes headcount, attendance, and project counts with zero-fallbacks for missing statuses', async () => {
    const repository = makeRepository();
    const summary = await new DashboardService(repository as never).getAdminSummary('tenant-1');

    expect(summary.headcount).toEqual({ total: 10, active: 8, onboarding: 2, offboarding: 0 });
    expect(summary.attendanceToday).toEqual({ present: 6, absent: 0, late: 1, halfDay: 0, onLeave: 2 });
    expect(summary.projects).toEqual({ active: 5, onHold: 0, completed: 5 });
  });

  it('returns payroll: null when no payroll run exists yet, rather than throwing', async () => {
    const repository = makeRepository({ latestPayrollRun: vi.fn().mockResolvedValue(null) });
    const summary = await new DashboardService(repository as never).getAdminSummary('tenant-1');
    expect(summary.payroll).toBeNull();
  });

  it('shapes the latest payroll run when one exists', async () => {
    const repository = makeRepository({
      latestPayrollRun: vi.fn().mockResolvedValue({ month: 3, year: 2026, status: 'PAID', totalNet: 120000, itemCount: 8 }),
    });
    const summary = await new DashboardService(repository as never).getAdminSummary('tenant-1');
    expect(summary.payroll).toEqual({ month: 3, year: 2026, status: 'PAID', totalNet: 120000, itemCount: 8 });
  });

  it('maps recent activity rows to a flat actorEmail, defaulting to null for system-attributed entries', async () => {
    const repository = makeRepository({
      recentActivity: vi.fn().mockResolvedValue([
        { id: 'log-1', action: 'TASK_UPDATED', targetType: 'Task', createdAt: new Date('2026-01-01'), actor: { email: 'ada@acme.com' } },
        { id: 'log-2', action: 'DOCUMENT_EMAILED', targetType: 'GeneratedDocument', createdAt: new Date('2026-01-02'), actor: null },
      ]),
    });
    const summary = await new DashboardService(repository as never).getAdminSummary('tenant-1');
    expect(summary.recentActivity).toEqual([
      { id: 'log-1', action: 'TASK_UPDATED', targetType: 'Task', createdAt: new Date('2026-01-01'), actorEmail: 'ada@acme.com' },
      { id: 'log-2', action: 'DOCUMENT_EMAILED', targetType: 'GeneratedDocument', createdAt: new Date('2026-01-02'), actorEmail: null },
    ]);
  });
});
