import { toast } from 'sonner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { Button } from '../../../shared/components/ui/button';
import { InviteStatusBadge } from './InviteStatusBadge';
import { useResendInvite, useRevokeInvite } from '../hooks/useInviteMutations';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import type { Invite } from '../types/user.types';

export function InvitationsTable({ invites }: { invites: Invite[] }) {
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();
  const canInvite = useHasPermission('user:invite');

  async function handleResend(invite: Invite) {
    try {
      await resendInvite.mutateAsync(invite.id);
      toast.success(`Invite resent to ${invite.email}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to resend invite.');
    }
  }

  async function handleRevoke(invite: Invite) {
    if (!window.confirm(`Revoke the invite for ${invite.email}? They will no longer be able to use this link.`)) return;
    try {
      await revokeInvite.mutateAsync(invite.id);
      toast.success(`Invite for ${invite.email} revoked.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke invite.');
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          {canInvite && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => (
          <TableRow key={invite.id}>
            <TableCell className="font-semibold">{invite.email}</TableCell>
            <TableCell>{invite.role.replace('_', ' ')}</TableCell>
            <TableCell>
              <InviteStatusBadge status={invite.status} />
            </TableCell>
            <TableCell className="text-[var(--muted-foreground)]">{new Date(invite.expiresAt).toLocaleDateString()}</TableCell>
            {canInvite && (
              <TableCell className="text-right">
                {invite.status === 'PENDING' ? (
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => handleResend(invite)}>
                      Resend
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[var(--destructive)]"
                      onClick={() => handleRevoke(invite)}
                    >
                      Revoke
                    </Button>
                  </div>
                ) : (
                  <span className="text-[var(--muted-foreground)]">—</span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
