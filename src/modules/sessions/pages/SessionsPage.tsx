import { MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useSessions } from '../hooks/useSessions';
import { useForceLogoutAll } from '../hooks/useForceLogoutAll';
import { SessionsTable } from '../components/SessionsTable';
import { useAuth } from '../../auth/context/AuthContext';
import { Button } from '../../../shared/components/ui/button';
import { ListPage } from '../../../shared/components/layout/ListPage';
import { ApiError } from '../../../shared/lib/api-client';

export function SessionsPage() {
  const { user, tenant } = useAuth();
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const forceLogoutAllMutation = useForceLogoutAll();
  const state = isLoading ? 'loading' : isError ? 'error' : !sessions || sessions.length === 0 ? 'empty' : 'ready';

  async function handleForceLogoutAll() {
    if (!window.confirm(`End every active session for everyone in ${tenant?.name ?? 'your organization'}?`)) return;
    try {
      await forceLogoutAllMutation.mutateAsync();
      toast.success('Every session has been ended tenant-wide.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to force-logout all users.');
    }
  }

  return (
    <ListPage
      title="Active sessions"
      subtitle="Every signed-in session across your organization, and who's still active."
      actions={
        sessions && sessions.length > 0 ? (
          <Button variant="destructive" loading={forceLogoutAllMutation.isPending} onClick={handleForceLogoutAll}>
            Force Logout All
          </Button>
        ) : undefined
      }
      state={state}
      errorProps={{ description: 'Failed to load active sessions.', onRetry: () => refetch() }}
      emptyProps={{ icon: MonitorSmartphone, title: 'No active sessions', description: 'Nobody is currently signed in.' }}
    >
      {sessions && <SessionsTable sessions={sessions} currentUserId={user?.id} />}
    </ListPage>
  );
}
