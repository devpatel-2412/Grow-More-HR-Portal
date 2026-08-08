import { useState } from 'react';
import { Users as UsersIcon, MailQuestion } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useInvites } from '../hooks/useInvites';
import { UserTable } from '../components/UserTable';
import { InvitationsTable } from '../components/InvitationsTable';
import { InviteUserDialog } from '../components/InviteUserDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { useAuth } from '../../auth/context/AuthContext';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { cn } from '../../../shared/utils/cn';

const TABS = ['team', 'invitations'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { team: 'Team', invitations: 'Invitations' };

export function UsersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('team');
  const pagination = usePagination(20);
  const invitesPagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useUsers(pagination.queryParams);
  const invitesQuery = useInvites({ page: invitesPagination.page, limit: invitesPagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Team</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Invite teammates and manage roles &amp; access.</p>
        </div>
        <InviteUserDialog />
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
              tab === t
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <Card>
          <div className="mb-4">
            <Input
              value={pagination.search}
              onChange={(e) => pagination.setSearch(e.target.value)}
              placeholder="Search by email..."
              aria-label="Search users"
              className="max-w-xs"
            />
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {isError && <ErrorState description="Failed to load users." onRetry={() => refetch()} />}

          {!isLoading && !isError && data && data.data.length === 0 && (
            <EmptyState icon={UsersIcon} title="No users yet" description="Invite your first teammate to get started." />
          )}

          {!isLoading && !isError && data && data.data.length > 0 && (
            <div className="space-y-4">
              <UserTable users={data.data} currentUserId={user?.id} />
              <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
            </div>
          )}
        </Card>
      )}

      {tab === 'invitations' && (
        <Card>
          {invitesQuery.isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {invitesQuery.isError && <ErrorState description="Failed to load invitations." onRetry={() => invitesQuery.refetch()} />}

          {!invitesQuery.isLoading && !invitesQuery.isError && invitesQuery.data && invitesQuery.data.data.length === 0 && (
            <EmptyState icon={MailQuestion} title="No invitations yet" description="Invitations you send will show up here." />
          )}

          {!invitesQuery.isLoading && !invitesQuery.isError && invitesQuery.data && invitesQuery.data.data.length > 0 && (
            <div className="space-y-4">
              <InvitationsTable invites={invitesQuery.data.data} />
              <PaginationBar meta={invitesQuery.data.meta} onPageChange={invitesPagination.setPage} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
