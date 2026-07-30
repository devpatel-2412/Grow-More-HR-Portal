import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { PayslipTable } from './PayslipTable';
import { renderWithProviders } from '../../../test/test-utils';
import type { PayrollItemRecord } from '../types/payroll.types';

function makeItem(overrides: Partial<PayrollItemRecord> = {}): PayrollItemRecord {
  return {
    id: 'pi-1',
    tenantId: 'tenant-1',
    payrollRunId: 'run-1',
    employeeId: 'emp-1',
    month: 7,
    year: 2026,
    basicSalary: 20000,
    hra: 8000,
    allowance: 2000,
    bonus: 0,
    overtimeHours: 0,
    overtimePay: 0,
    grossSalary: 30000,
    pfDeduction: 1800,
    esicDeduction: 0,
    tdsDeduction: 0,
    ptDeduction: 200,
    unpaidLeaveDays: 0,
    unpaidLeaveDeduction: 0,
    totalDeductions: 2000,
    netSalary: 28000,
    payslipUrl: null,
    status: 'DRAFT',
    ...overrides,
  };
}

describe('PayslipTable', () => {
  it('renders the period and the net pay', () => {
    renderWithProviders(<PayslipTable items={[makeItem()]} />);

    expect(screen.getByText('July 2026')).toBeInTheDocument();
    expect(screen.getByText('28,000.00')).toBeInTheDocument();
  });

  it('shows a dash when there is no unpaid leave, and the days when there is', () => {
    const { unmount } = renderWithProviders(<PayslipTable items={[makeItem()]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <PayslipTable items={[makeItem({ unpaidLeaveDays: 2, unpaidLeaveDeduction: 2307.69 })]} />,
    );
    expect(screen.getByText('2d / 2,307.69')).toBeInTheDocument();
  });

  it('hides the employee column unless asked for it', () => {
    const { unmount } = renderWithProviders(<PayslipTable items={[makeItem()]} />);
    expect(screen.queryByRole('columnheader', { name: /employee/i })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(
      <PayslipTable items={[makeItem()]} showEmployee employeeNames={{ 'emp-1': 'Wanda Worker' }} />,
    );
    expect(screen.getByRole('columnheader', { name: /employee/i })).toBeInTheDocument();
    expect(screen.getByText('Wanda Worker')).toBeInTheDocument();
  });

  it('renders an empty message with no payslips', () => {
    renderWithProviders(<PayslipTable items={[]} />);
    expect(screen.getByText(/no payslips yet/i)).toBeInTheDocument();
  });
});
