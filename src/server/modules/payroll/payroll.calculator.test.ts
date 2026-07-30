import { describe, it, expect } from 'vitest';
import { calculatePayroll, round2, type PayrollPolicy, type PayrollComponents } from './payroll.calculator.js';

const policy: PayrollPolicy = {
  pfEmployeeRate: 0.12,
  pfWageCeiling: 15000,
  esicEmployeeRate: 0.0075,
  esicWageCeiling: 21000,
  professionalTax: 200,
  tdsRate: 0,
  overtimeMultiplier: 1.5,
  workingDaysPerMonth: 26,
};

const base: PayrollComponents = {
  basicSalary: 20000,
  hra: 8000,
  allowance: 2000,
  bonus: 0,
  overtimeHours: 0,
  unpaidLeaveDays: 0,
};

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(1234.5678)).toBe(1234.57);
  });
});

describe('calculatePayroll', () => {
  it('sums earnings into gross', () => {
    const result = calculatePayroll(base, policy);
    expect(result.grossSalary).toBe(30000);
  });

  it('caps PF at the statutory wage ceiling', () => {
    const result = calculatePayroll(base, policy);
    // Basic is 20000 but PF is charged on the 15000 ceiling: 15000 * 0.12
    expect(result.pfDeduction).toBe(1800);
  });

  it('charges PF on actual basic when it is below the ceiling', () => {
    const result = calculatePayroll({ ...base, basicSalary: 10000, hra: 0, allowance: 0 }, policy);
    expect(result.pfDeduction).toBe(1200);
  });

  it('drops ESIC entirely above the gross ceiling', () => {
    const result = calculatePayroll(base, policy); // gross 30000 > 21000
    expect(result.esicDeduction).toBe(0);
  });

  it('applies ESIC when gross is under the ceiling', () => {
    const result = calculatePayroll({ ...base, basicSalary: 10000, hra: 4000, allowance: 1000 }, policy);
    expect(result.grossSalary).toBe(15000);
    expect(result.esicDeduction).toBe(112.5);
  });

  it('prices overtime off basic pay at the configured multiplier', () => {
    const result = calculatePayroll({ ...base, overtimeHours: 10 }, policy);
    // 20000 / (26*8) = 96.153846/hr, * 10h * 1.5 = 1442.31
    expect(result.overtimePay).toBe(1442.31);
    expect(result.grossSalary).toBe(31442.31);
  });

  it('deducts unpaid leave at the per-day rate before computing gross', () => {
    const result = calculatePayroll({ ...base, unpaidLeaveDays: 2 }, policy);
    // 30000 / 26 = 1153.846/day, * 2 = 2307.69
    expect(result.unpaidLeaveDeduction).toBe(2307.69);
    expect(result.grossSalary).toBe(27692.31);
  });

  it('nets out every deduction', () => {
    const result = calculatePayroll(base, policy);
    expect(result.totalDeductions).toBe(2000); // 1800 PF + 0 ESIC + 0 TDS + 200 PT
    expect(result.netSalary).toBe(28000);
  });

  it('applies a flat TDS rate when the tenant configures one', () => {
    const result = calculatePayroll(base, { ...policy, tdsRate: 0.1 });
    expect(result.tdsDeduction).toBe(3000);
    expect(result.netSalary).toBe(25000);
  });

  it('waives professional tax when there is no gross pay', () => {
    const result = calculatePayroll(
      { basicSalary: 0, hra: 0, allowance: 0, bonus: 0, overtimeHours: 0, unpaidLeaveDays: 0 },
      policy,
    );
    expect(result.ptDeduction).toBe(0);
    expect(result.netSalary).toBe(0);
  });

  it('does not divide by zero when working days are misconfigured', () => {
    const result = calculatePayroll({ ...base, overtimeHours: 5, unpaidLeaveDays: 1 }, { ...policy, workingDaysPerMonth: 0 });
    expect(result.overtimePay).toBe(0);
    expect(result.unpaidLeaveDeduction).toBe(0);
    expect(Number.isFinite(result.netSalary)).toBe(true);
  });
});
