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
import { ListPage } from '../../../shared/components/layout/ListPage';

export function AnnouncementsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useAnnouncements({ page: pagination.page, limit: pagination.limit });
  const deleteMutation = useDeleteAnnouncement();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'PROJECT_MANAGER';
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Announcement removed.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to remove this announcement.');
    }
  }

  return (
    <ListPage
      title="Announcements"
      subtitle="Company-wide and department notices."
      maxWidth="4xl"
      wrapContent={false}
      actions={canManage ? <PublishAnnouncementDialog /> : undefined}
      state={state}
      errorProps={{ description: 'Failed to load announcements.', onRetry: () => refetch() }}
      emptyProps={{ icon: Megaphone, title: 'Nothing posted yet', description: 'Check back later.' }}
    >
      {data && (
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
    </ListPage>
  );
}
