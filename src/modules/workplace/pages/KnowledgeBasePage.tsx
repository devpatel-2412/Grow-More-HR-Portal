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
import { ListPage } from '../../../shared/components/layout/ListPage';
import { useHasPermission } from '../../auth/hooks/useHasPermission';

export function KnowledgeBasePage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useKbArticles({ page: pagination.page, limit: pagination.limit });
  const deleteMutation = useDeleteKbArticle();
  const canManage = useHasPermission('kb:manage');
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Article deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this article.');
    }
  }

  return (
    <ListPage
      title="Knowledge base"
      subtitle="Policies, how-tos, and reference articles."
      maxWidth="4xl"
      wrapContent={false}
      actions={canManage ? <CreateArticleDialog /> : undefined}
      state={state}
      errorProps={{ description: 'Failed to load articles.', onRetry: () => refetch() }}
      emptyProps={{ icon: BookOpen, title: 'No articles yet', description: 'Publish the first one.' }}
    >
      {data && (
        <div className="space-y-4">
          {data.data.map((article) => (
            <Card key={article.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <button type="button" className="text-left" onClick={() => setExpandedId((prev) => (prev === article.id ? undefined : article.id))}>
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
    </ListPage>
  );
}
