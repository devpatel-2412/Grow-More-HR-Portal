import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { Button } from '../../../shared/components/ui/button';
import { Avatar } from '../../../shared/components/ui/avatar';
import { RoleBadge, UserStatusBadge } from './UserBadges';
import { useUpdateUserRole } from '../hooks/useUpdateUserRole';
import { useUpdateUserStatus } from '../hooks/useUpdateUserStatus';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
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
  const canUpdateRole = useHasPermission('user:role:update');
  const canUpdateStatus = useHasPermission('user:status:update');

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
          {canUpdateStatus && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar name={u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email} size="sm" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email}</div>
                  {u.profile && <div className="truncate text-[var(--muted-foreground)]">{u.email}</div>}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {u.id === currentUserId || !canUpdateRole ? (
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
            {canUpdateStatus && (
              <TableCell className="text-right">
                {u.id === currentUserId ? (
                  <span className="text-[var(--muted-foreground)]">You</span>
                ) : (
                  <div className="flex justify-end gap-2">
                    {STATUS_ACTIONS[u.status].map((action) => (
                      <Button
                        key={action.next}
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => handleStatusChange(u.id, u.email, action.next, action.label)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
