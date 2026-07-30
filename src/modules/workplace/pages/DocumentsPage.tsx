import { toast } from 'sonner';
import { FileText, Trash2 } from 'lucide-react';
import { useDocuments, useDeleteDocument } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { UploadDocumentDialog } from '../components/UploadDocumentDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { useAuth } from '../../auth/context/AuthContext';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function DocumentsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useDocuments({ page: pagination.page, limit: pagination.limit });
  const deleteMutation = useDeleteDocument();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'PROJECT_MANAGER';

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Document deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this document.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Documents</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Company files organized by folder.</p>
        </div>
        {canManage && <UploadDocumentDialog />}
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load documents." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={FileText} title="No documents yet" description="Add the first one." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer noopener" className="text-[var(--primary)] hover:underline">
                        {doc.name}
                      </a>
                    </TableCell>
                    <TableCell>{doc.folderPath}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <Button size="icon" variant="ghost" aria-label="Delete document" onClick={() => remove(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
