import type { UserRole, UserStatus } from '../../auth/types/auth.types';

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  avatarUrl: string | null;
  profile: { firstName: string; lastName: string } | null;
}

export interface InvitedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface Invite {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}
