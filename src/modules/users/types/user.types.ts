import type { UserRole, UserStatus } from '../../auth/types/auth.types';

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  profile: { firstName: string; lastName: string } | null;
}

export interface InvitedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
