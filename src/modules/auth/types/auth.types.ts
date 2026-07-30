export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR_MANAGER' | 'PROJECT_MANAGER' | 'EMPLOYEE' | 'CLIENT';
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
}

export interface MeResponse {
  user: AuthUser;
  profile: EmployeeProfile | null;
  tenant: Tenant;
}

export type LoginResponse =
  | { requiresTwoFactor: true; challengeToken: string }
  | { requiresTwoFactor: false; accessToken: string; user: AuthUser };
