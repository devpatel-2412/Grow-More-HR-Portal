export type LeaveType =
  | 'CASUAL'
  | 'SICK'
  | 'EARNED'
  | 'PAID'
  | 'UNPAID'
  | 'COMP_OFF'
  | 'MATERNITY'
  | 'PATERNITY'
  | 'WORK_FROM_HOME'
  | 'REMOTE_WORK';

export type LeaveStatus = 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  managerId: string | null;
  managerApprovedById: string | null;
  managerReviewedAt: string | null;
  hrApprovedById: string | null;
  hrReviewedAt: string | null;
  createdAt: string;
}
