import { MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useSessions } from '../hooks/useSessions';
import { useForceLogoutAll } from '../hooks/useForceLogoutAll';
import { SessionsTable } from '../components/SessionsTable';
import { useAuth } from '../../auth/context/AuthContext';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { ApiError } from '../../../shared/lib/api-client';

export function SessionsPage() {
  const { user, tenant } = useAuth();
  const { data: sessions, isLoading, isError, refetch } = useSessions();
  const forceLogoutAllMutation = useForceLogoutAll();

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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Active sessions</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Every signed-in session across your organization, and who's still active.
          </p>
        </div>
        {sessions && sessions.length > 0 && (
          <Button variant="destructive" loading={forceLogoutAllMutation.isPending} onClick={handleForceLogoutAll}>
            Force Logout All
          </Button>
        )}
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load active sessions." onRetry={() => refetch()} />}

        {!isLoading && !isError && sessions && sessions.length === 0 && (
          <EmptyState icon={MonitorSmartphone} title="No active sessions" description="Nobody is currently signed in." />
        )}

        {!isLoading && !isError && sessions && sessions.length > 0 && (
          <SessionsTable sessions={sessions} currentUserId={user?.id} />
        )}
      </Card>
    </div>
  );
}
