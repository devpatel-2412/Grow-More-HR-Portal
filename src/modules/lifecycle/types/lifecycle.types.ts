export interface ChecklistItemRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  label: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

export type LifecycleEventType = 'CONFIRMATION' | 'PROMOTION' | 'TRANSFER' | 'EXIT_INITIATED' | 'EXIT_COMPLETED';

export interface LifecycleEventRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  type: LifecycleEventType;
  effectiveDate: string;
  previousValue: string | null;
  newValue: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
}

export type FnfStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface FnfSettlementRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  lastWorkingDay: string;
  pendingSalary: number;
  leaveEncashment: number;
  bonus: number;
  deductions: number;
  netPayable: number;
  status: FnfStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
