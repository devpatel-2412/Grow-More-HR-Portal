export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface SalaryStructureRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  effectiveFrom: string;
  basicSalary: number;
  hra: number;
  allowance: number;
  createdAt: string;
}

export interface PayrollItemRecord {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  month: number;
  year: number;
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
  payslipUrl: string | null;
  status: PayrollStatus;
}

export interface PayrollRunRecord {
  id: string;
  tenantId: string;
  month: number;
  year: number;
  status: PayrollStatus;
  totalNet: number;
  itemCount: number;
  processedById: string | null;
  processedAt: string | null;
  createdAt: string;
  items?: PayrollItemRecord[];
}
