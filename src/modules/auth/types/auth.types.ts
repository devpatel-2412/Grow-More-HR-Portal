export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'HR_MANAGER'
  | 'HR_EXECUTIVE'
  | 'PROJECT_MANAGER'
  | 'TEAM_LEADER'
  | 'EMPLOYEE'
  | 'CLIENT'
  | 'RECRUITER'
  | 'FINANCE'
  | 'ACCOUNTS'
  | 'CANDIDATE';
export type UserStatus = 'PENDING_INVITE' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  font: string;
  attendanceShiftStartMinutes: number;
  attendanceRequiredWorkMinutes: number;
  attendanceAllowedBreakMinutes: number;
  attendanceBreakOverageExtendsLogout: boolean;
  gstin: string | null;
  gstStateCode: string | null;
  // null on sessionTimeoutMinutes means "never expire due to inactivity".
  sessionTimeoutMinutes: number | null;
  sessionWarningMinutes: number;
  rememberMeDurationDays: number;
  maxConcurrentSessions: number | null;
}

export interface MeResponse {
  user: AuthUser;
  profile: EmployeeProfile | null;
  tenant: Tenant;
}

export type LoginResponse =
  | { requiresTwoFactor: true; challengeToken: string }
  | { requiresTwoFactor: false; accessToken: string; user: AuthUser };

export interface LoginHistoryEntry {
  id: string;
  action: 'USER_LOGIN_SUCCESS' | 'USER_LOGIN_FAILURE';
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
