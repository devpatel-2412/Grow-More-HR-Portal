import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminKpiDashboard } from './AdminKpiDashboard';
import { useAdminSummary } from '../hooks/useDashboard';
import type { AdminDashboardSummary } from '../types/dashboard.types';

vi.mock('../hooks/useDashboard');
const mockUseAdminSummary = vi.mocked(useAdminSummary);

function makeSummary(overrides: Partial<AdminDashboardSummary> = {}): AdminDashboardSummary {
  return {
    headcount: { total: 25, active: 22, onboarding: 3, offboarding: 0 },
    attendanceToday: { present: 18, absent: 2, late: 1, halfDay: 0, onLeave: 4 },
    departmentCount: 5,
    branchCount: 2,
    projects: { active: 6, onHold: 1, completed: 14 },
    pendingTaskCount: 33,
    payroll: { month: 3, year: 2026, status: 'PAID', totalNet: 450000, itemCount: 25 },
    revenueThisMonth: 82000,
    birthdays: [],
    anniversaries: [],
    newEmployees: [],
    recentActivity: [],
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminKpiDashboard />
    </MemoryRouter>,
  );
}

describe('AdminKpiDashboard', () => {
  it('shows skeletons while loading', () => {
    mockUseAdminSummary.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as never);
    const { container } = renderDashboard();
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it('shows an error state with a retry action when the summary fails to load', () => {
    const refetch = vi.fn();
    mockUseAdminSummary.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as never);
    renderDashboard();
    expect(screen.getByText(/failed to load organization kpis/i)).toBeInTheDocument();
  });

  it('renders headcount, attendance, and revenue figures from the summary', () => {
    mockUseAdminSummary.mockReturnValue({ data: makeSummary(), isLoading: false, isError: false, refetch: vi.fn() } as never);
    renderDashboard();

    expect(screen.getByText('25')).toBeInTheDocument(); // total headcount
    expect(screen.getByText('18')).toBeInTheDocument(); // present today
    expect(screen.getByText('$82,000')).toBeInTheDocument(); // revenue this month
  });

  it('shows a friendly placeholder instead of a payroll figure when no payroll run exists yet', () => {
    mockUseAdminSummary.mockReturnValue({
      data: makeSummary({ payroll: null }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDashboard();
    expect(screen.getByText('No payroll run yet')).toBeInTheDocument();
  });

  it('lists upcoming birthdays with a human-friendly "Today"/"Tomorrow" label', () => {
    mockUseAdminSummary.mockReturnValue({
      data: makeSummary({
        birthdays: [{ id: 'e1', firstName: 'Wanda', lastName: 'Worker', dateOfBirth: '1990-06-10', daysAway: 0 }],
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderDashboard();
    expect(screen.getByText('Wanda Worker')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
