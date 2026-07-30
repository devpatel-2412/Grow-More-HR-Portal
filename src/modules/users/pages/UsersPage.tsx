import { Users as UsersIcon } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { UserTable } from '../components/UserTable';
import { InviteUserDialog } from '../components/InviteUserDialog';
import { usePagination } from '../../../shared/hooks/usePagination';
import { useAuth } from '../../auth/context/AuthContext';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function UsersPage() {
  const { user } = useAuth();
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useUsers(pagination.queryParams);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Team</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Invite teammates and manage roles &amp; access.</p>
        </div>
        <InviteUserDialog />
      </div>

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
    </div>
  );
}
