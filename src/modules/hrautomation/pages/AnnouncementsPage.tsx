import { toast } from 'sonner';
import { Megaphone, Trash2 } from 'lucide-react';
import { useAnnouncements, useDeleteAnnouncement } from '../hooks/useHrAutomation';
import { usePagination } from '../../../shared/hooks/usePagination';
import { PublishAnnouncementDialog } from '../components/PublishAnnouncementDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { useAuth } from '../../auth/context/AuthContext';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function AnnouncementsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useAnnouncements({ page: pagination.page, limit: pagination.limit });
  const deleteMutation = useDeleteAnnouncement();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'PROJECT_MANAGER';

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Announcement removed.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to remove this announcement.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Announcements</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Company-wide and department notices.</p>
        </div>
        {canManage && <PublishAnnouncementDialog />}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && <ErrorState description="Failed to load announcements." onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={Megaphone} title="Nothing posted yet" description="Check back later." />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="space-y-4">
          {data.data.map((announcement) => (
            <Card key={announcement.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">{announcement.title}</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">{new Date(announcement.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={announcement.audience === 'ALL' ? 'info' : 'neutral'}>
                    {announcement.audience === 'ALL' ? 'Everyone' : announcement.department}
                  </Badge>
                  {canManage && (
                    <Button size="icon" variant="ghost" aria-label="Delete announcement" onClick={() => remove(announcement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{announcement.body}</p>
            </Card>
          ))}
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </div>
  );
}
