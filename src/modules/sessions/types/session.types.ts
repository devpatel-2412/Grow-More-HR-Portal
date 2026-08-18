import type { UserRole } from '../../auth/types/auth.types';

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  role: UserRole;
  loginTime: string;
  lastActivity: string;
  browser: string;
  device: string;
  ipAddress: string | null;
  rememberMe: boolean;
}
