import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Avatar } from '../../../shared/components/ui/avatar';
import { useForceLogoutUser } from '../hooks/useForceLogoutUser';
import { ApiError } from '../../../shared/lib/api-client';
import type { ActiveSession } from '../types/session.types';

export function SessionsTable({ sessions, currentUserId }: { sessions: ActiveSession[]; currentUserId?: string }) {
  const forceLogoutUser = useForceLogoutUser();

  async function handleForceLogout(session: ActiveSession) {
    const isSelf = session.userId === currentUserId;
    const confirmMessage = isSelf
      ? `End all of your own active sessions? You'll be signed out immediately, including this tab.`
      : `End all active sessions for ${session.userName}? They will need to log in again.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await forceLogoutUser.mutateAsync(session.userId);
      toast.success(`Signed out ${session.userName}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to force-logout this user.');
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Login time</TableHead>
          <TableHead>Last activity</TableHead>
          <TableHead>Browser / Device</TableHead>
          <TableHead>IP address</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar name={session.userName} imageUrl={session.avatarUrl} size="sm" />
                <div>
                  <div className="font-semibold">{session.userName}</div>
                  <div className="text-[var(--muted-foreground)]">{session.userEmail}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{new Date(session.loginTime).toLocaleString()}</TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{new Date(session.lastActivity).toLocaleString()}</TableCell>
            <TableCell className="text-[var(--muted-foreground)]">
              {session.browser} &middot; {session.device}
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{session.ipAddress ?? 'Unknown'}</TableCell>
            <TableCell className="text-right">
              <button
                type="button"
                onClick={() => handleForceLogout(session)}
                className="text-[var(--destructive)] hover:underline"
              >
                Force Logout
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
