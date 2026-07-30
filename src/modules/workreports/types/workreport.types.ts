export type WorkReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WorkReportRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  completedTasks: string[];
  pendingTasks: string[];
  tomorrowPlan: string[];
  issues: string | null;
  timeSpentMinutes: number;
  status: WorkReportStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}
