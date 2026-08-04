export interface AdminDashboardSummary {
  headcount: { total: number; active: number; onboarding: number; offboarding: number };
  attendanceToday: { present: number; absent: number; late: number; halfDay: number; onLeave: number };
  departmentCount: number;
  branchCount: number;
  projects: { active: number; onHold: number; completed: number };
  pendingTaskCount: number;
  payroll: { month: number; year: number; status: string; totalNet: number; itemCount: number } | null;
  revenueThisMonth: number;
  birthdays: { id: string; firstName: string; lastName: string; dateOfBirth: string; daysAway: number }[];
  anniversaries: { id: string; firstName: string; lastName: string; dateOfJoining: string; daysAway: number }[];
  newEmployees: { id: string; firstName: string; lastName: string; designation: string; department: string; dateOfJoining: string }[];
  recentActivity: { id: string; action: string; targetType: string | null; createdAt: string; actorEmail: string | null }[];
}
