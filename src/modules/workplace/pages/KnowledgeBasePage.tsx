import { useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Trash2 } from 'lucide-react';
import { useKbArticles, useDeleteKbArticle } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateArticleDialog } from '../components/CreateArticleDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { useAuth } from '../../auth/context/AuthContext';

export function KnowledgeBasePage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useKbArticles({ page: pagination.page, limit: pagination.limit });
  const deleteMutation = useDeleteKbArticle();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'PROJECT_MANAGER';
  const [expandedId, setExpandedId] = useState<string | undefined>();

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Article deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this article.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Knowledge base</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Policies, how-tos, and reference articles.</p>
        </div>
        {canManage && <CreateArticleDialog />}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {isError && <ErrorState description="Failed to load articles." onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={BookOpen} title="No articles yet" description="Publish the first one." />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="space-y-4">
          {data.data.map((article) => (
            <Card key={article.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setExpandedId((prev) => (prev === article.id ? undefined : article.id))}
                >
                  <h3 className="text-sm font-bold text-[var(--foreground)]">{article.title}</h3>
                  <Badge variant="neutral">{article.category}</Badge>
                </button>
                {canManage && (
                  <Button size="icon" variant="ghost" aria-label="Delete article" onClick={() => remove(article.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {expandedId === article.id && <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{article.content}</p>}
            </Card>
          ))}
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </div>
  );
}
