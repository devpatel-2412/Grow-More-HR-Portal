import { useLoginHistory } from '../hooks/useLoginHistory';
import { Badge } from '../../../shared/components/ui/badge';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

function shortenUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/);
  const osMatch = userAgent.match(/(Windows|Mac OS X|Linux|Android|iOS)/);
  const browser = browserMatch ? browserMatch[1].replace('Edg', 'Edge') : 'Unknown browser';
  return osMatch ? `${browser} on ${osMatch[1]}` : browser;
}

/** Self-service "recent sign-ins" — the caller's own login attempts, distinct from the tenant-wide admin Audit Log. */
export function LoginHistoryPanel() {
  const { data, isLoading } = useLoginHistory({ page: 1, limit: 5 });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return <p className="text-xs text-[var(--muted-foreground)]">No sign-in activity recorded yet.</p>;
  }

  return (
    <ul className="space-y-2 text-xs">
      {data.data.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-2">
          <div className="min-w-0">
            <p className="truncate text-[var(--foreground)]">{shortenUserAgent(entry.userAgent)}</p>
            <p className="text-[var(--muted-foreground)]">
              {entry.ipAddress ?? 'Unknown IP'} &middot; {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={entry.action === 'USER_LOGIN_SUCCESS' ? 'success' : 'danger'}>
            {entry.action === 'USER_LOGIN_SUCCESS' ? 'Success' : 'Failed'}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
