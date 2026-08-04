import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { RoleBadge, UserStatusBadge } from './UserBadges';
import { useUpdateUserRole } from '../hooks/useUpdateUserRole';
import { useUpdateUserStatus } from '../hooks/useUpdateUserStatus';
import { ApiError } from '../../../shared/lib/api-client';
import { STAFF_ROLES } from '../schemas/user.schemas';
import type { UserListItem } from '../types/user.types';
import type { UserRole, UserStatus } from '../../auth/types/auth.types';

const STATUS_ACTIONS: Record<UserStatus, { label: string; next: UserStatus }[]> = {
  ACTIVE: [{ label: 'Suspend', next: 'SUSPENDED' }, { label: 'Deactivate', next: 'DEACTIVATED' }],
  SUSPENDED: [{ label: 'Reactivate', next: 'ACTIVE' }, { label: 'Deactivate', next: 'DEACTIVATED' }],
  DEACTIVATED: [{ label: 'Reactivate', next: 'ACTIVE' }],
  PENDING_INVITE: [{ label: 'Deactivate', next: 'DEACTIVATED' }],
};

export function UserTable({ users, currentUserId }: { users: UserListItem[]; currentUserId?: string }) {
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();

  async function handleRoleChange(id: string, role: UserRole) {
    try {
      await updateRole.mutateAsync({ id, role });
      toast.success('Role updated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update role.');
    }
  }

  async function handleStatusChange(id: string, email: string, next: UserStatus, label: string) {
    if (!window.confirm(`${label} ${email}?`)) return;
    try {
      await updateStatus.mutateAsync({ id, status: next });
      toast.success(`${email} is now ${next.replace('_', ' ').toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name / Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last login</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div className="font-semibold">{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email}</div>
              {u.profile && <div className="text-[var(--muted-foreground)]">{u.email}</div>}
            </TableCell>
            <TableCell>
              {u.id === currentUserId ? (
                <RoleBadge role={u.role} />
              ) : (
                <Select value={u.role} onValueChange={(value) => handleRoleChange(u.id, value as UserRole)}>
                  <SelectTrigger className="h-8 w-40 text-xs" aria-label={`Change role for ${u.email}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </TableCell>
            <TableCell>
              <UserStatusBadge status={u.status} />
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">
              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
            </TableCell>
            <TableCell className="text-right">
              {u.id === currentUserId ? (
                <span className="text-[var(--muted-foreground)]">You</span>
              ) : (
                <div className="flex justify-end gap-2">
                  {STATUS_ACTIONS[u.status].map((action) => (
                    <button
                      key={action.next}
                      type="button"
                      onClick={() => handleStatusChange(u.id, u.email, action.next, action.label)}
                      className="text-[var(--primary)] hover:underline"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
