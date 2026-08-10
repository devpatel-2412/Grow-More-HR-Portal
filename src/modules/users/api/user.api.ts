import { api } from '../../../shared/lib/api-client';
import type { InviteUserFormValues, AcceptInviteFormValues } from '../schemas/user.schemas';
import type { UserListItem, InvitedUser, Invite } from '../types/user.types';
import type { UserRole, UserStatus } from '../../auth/types/auth.types';

export interface ListUsersQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListInvitesQuery {
  page: number;
  limit: number;
}

export const userApi = {
  list: (query: ListUsersQuery) => api.getPaginated<UserListItem>('/users', query),
  invite: (values: InviteUserFormValues) => api.post<InvitedUser>('/users/invite', values),
  invitableRoles: () => api.get<{ roles: UserRole[] }>('/users/invitable-roles'),
  listInvites: (query: ListInvitesQuery) => api.getPaginated<Invite>('/users/invites', query),
  resendInvite: (id: string) => api.post<Invite>(`/users/invites/${id}/resend`),
  revokeInvite: (id: string) => api.post<void>(`/users/invites/${id}/revoke`),
  acceptInvite: (values: AcceptInviteFormValues) => api.post<{ id: string; email: string; status: UserStatus }>('/users/invite/accept', values),
  updateRole: (id: string, role: UserRole) => api.patch<{ id: string; role: UserRole }>(`/users/${id}/role`, { role }),
  updateStatus: (id: string, status: UserStatus) => api.patch<{ id: string; status: UserStatus }>(`/users/${id}/status`, { status }),
};
