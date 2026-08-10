// Exactly 6 fixed roles — no custom roles. SUPER_ADMIN always has full access; the other 5 roles'
// access is entirely decided by a SUPER_ADMIN through the Roles & Permissions page.
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR_MANAGER' | 'PROJECT_MANAGER' | 'TEAM_LEADER' | 'EMPLOYEE';
export type UserStatus = 'PENDING_INVITE' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** The caller's own effective permission set (resource:action strings) — drives permission-aware UI, e.g. useHasPermission(). */
  permissions: string[];
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
