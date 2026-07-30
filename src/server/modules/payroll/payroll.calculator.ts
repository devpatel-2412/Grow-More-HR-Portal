/**
 * Pure payroll arithmetic — no I/O, so every rule here is directly unit-testable and the
 * numbers on a payslip can always be reproduced from its inputs.
 *
 * Statutory rates are passed in from tenant settings rather than hardcoded: PF/ESIC/PT/TDS
 * differ by jurisdiction and change year to year. TDS in particular is a flat fallback rate —
 * real TDS depends on per-employee investment declarations and income-tax slabs, which this
 * module deliberately does not model.
 */

export interface PayrollPolicy {
  pfEmployeeRate: number;
  pfWageCeiling: number;
  esicEmployeeRate: number;
  esicWageCeiling: number;
  professionalTax: number;
  tdsRate: number;
  overtimeMultiplier: number;
  workingDaysPerMonth: number;
}

export interface PayrollComponents {
  basicSalary: number;
  hra: number;
  allowance: number;
  bonus: number;
  overtimeHours: number;
  unpaidLeaveDays: number;
}

export interface PayrollBreakdown {
  basicSalary: number;
  hra: number;
  allowance: number;
  bonus: number;
  overtimeHours: number;
  overtimePay: number;
  grossSalary: number;
  pfDeduction: number;
  esicDeduction: number;
  tdsDeduction: number;
  ptDeduction: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
}

/** Currency is stored as Float, so every derived figure is rounded to paise to avoid drift. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePayroll(components: PayrollComponents, policy: PayrollPolicy): PayrollBreakdown {
  const { basicSalary, hra, allowance, bonus, overtimeHours, unpaidLeaveDays } = components;

  const monthlyEarnings = basicSalary + hra + allowance;
  const perDayRate = policy.workingDaysPerMonth > 0 ? monthlyEarnings / policy.workingDaysPerMonth : 0;
  const unpaidLeaveDeduction = round2(perDayRate * unpaidLeaveDays);

  // Overtime is priced off basic pay only — allowances are not part of the hourly rate.
  const hourlyRate = policy.workingDaysPerMonth > 0 ? basicSalary / (policy.workingDaysPerMonth * 8) : 0;
  const overtimePay = round2(hourlyRate * overtimeHours * policy.overtimeMultiplier);

  const grossSalary = round2(monthlyEarnings + bonus + overtimePay - unpaidLeaveDeduction);

  // PF applies to basic pay capped at the statutory wage ceiling.
  const pfDeduction = round2(Math.min(basicSalary, policy.pfWageCeiling) * policy.pfEmployeeRate);

  // ESIC drops away entirely once gross passes the ceiling — it is not a taper.
  const esicDeduction = grossSalary > policy.esicWageCeiling ? 0 : round2(grossSalary * policy.esicEmployeeRate);

  const tdsDeduction = round2(grossSalary * policy.tdsRate);
  const ptDeduction = grossSalary > 0 ? policy.professionalTax : 0;

  const totalDeductions = round2(pfDeduction + esicDeduction + tdsDeduction + ptDeduction);
  const netSalary = round2(grossSalary - totalDeductions);

  return {
    basicSalary: round2(basicSalary),
    hra: round2(hra),
    allowance: round2(allowance),
    bonus: round2(bonus),
    overtimeHours,
    overtimePay,
    grossSalary,
    pfDeduction,
    esicDeduction,
    tdsDeduction,
    ptDeduction,
    unpaidLeaveDays,
    unpaidLeaveDeduction,
    totalDeductions,
    netSalary,
  };
}
