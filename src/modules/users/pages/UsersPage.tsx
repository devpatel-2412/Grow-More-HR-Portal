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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../shared/components/ui/tabs';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

type Tab = 'team' | 'invitations';

export function UsersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('team');
  const pagination = usePagination(20);
  const invitesPagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useUsers(pagination.queryParams);
  const invitesQuery = useInvites({ page: invitesPagination.page, limit: invitesPagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Invite teammates and manage roles &amp; access.</p>
        </div>
        <InviteUserDialog />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4">
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
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
