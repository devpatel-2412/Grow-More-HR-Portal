import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Trash2, Archive, ArchiveRestore, History, Replace, Download } from 'lucide-react';
import { useDocuments, useDeleteDocument, useArchiveDocument, useRestoreDocument, useDownloadDocument } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { UploadDocumentDialog } from '../components/UploadDocumentDialog';
import { DocumentVersionHistoryDialog } from '../components/DocumentVersionHistoryDialog';
import { ReplaceDocumentFileDialog } from '../components/ReplaceDocumentFileDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';
import type { DocumentRecord } from '../types/workplace.types';

export function DocumentsPage() {
  const pagination = usePagination(20);
  const [showArchived, setShowArchived] = useState(false);
  const [versionsFor, setVersionsFor] = useState<DocumentRecord | undefined>();
  const [replaceFor, setReplaceFor] = useState<DocumentRecord | undefined>();
  const { data, isLoading, isError, refetch } = useDocuments({
    page: pagination.page,
    limit: pagination.limit,
    archived: showArchived,
  });
  const deleteMutation = useDeleteDocument();
  const archiveMutation = useArchiveDocument();
  const restoreMutation = useRestoreDocument();
  const downloadMutation = useDownloadDocument();
  const canManage = useHasPermission('document:manage');
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Document deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this document.');
    }
  }

  async function archive(id: string) {
    try {
      await archiveMutation.mutateAsync(id);
      toast.success('Document archived.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to archive this document.');
    }
  }

  async function restore(id: string) {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success('Document restored.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to restore this document.');
    }
  }

  async function download(id: string) {
    try {
      const { url, fileName } = await downloadMutation.mutateAsync(id);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to download this document.');
    }
  }

  return (
    <>
      <ListPage
        title="Documents"
        subtitle="Company files organized by folder, with full version history."
        actions={canManage ? <UploadDocumentDialog /> : undefined}
        filters={
          <>
            <Button variant={showArchived ? 'outline' : 'default'} size="sm" onClick={() => setShowArchived(false)}>
              Active
            </Button>
            <Button variant={showArchived ? 'default' : 'outline'} size="sm" onClick={() => setShowArchived(true)}>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
          </>
        }
        state={state}
        errorProps={{ description: 'Failed to load documents.', onRetry: () => refetch() }}
        emptyProps={{
          icon: FileText,
          title: showArchived ? 'Nothing archived' : 'No documents yet',
          description: showArchived ? 'Archived documents will show up here.' : 'Add the first one.',
        }}
      >
        {data && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-[var(--foreground)]">{doc.name}</TableCell>
                    <TableCell>{doc.category ? <Badge variant="neutral">{doc.category}</Badge> : '—'}</TableCell>
                    <TableCell>{doc.folderPath}</TableCell>
                    <TableCell>v{doc.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Download ${doc.name}`} onClick={() => download(doc.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Version history for ${doc.name}`} onClick={() => setVersionsFor(doc)}>
                          <History className="h-4 w-4" />
                        </Button>
                        {canManage && !showArchived && (
                          <>
                            <Button size="icon" variant="ghost" aria-label={`Replace file for ${doc.name}`} onClick={() => setReplaceFor(doc)}>
                              <Replace className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" aria-label={`Archive ${doc.name}`} onClick={() => archive(doc.id)}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canManage && showArchived && (
                          <Button size="icon" variant="ghost" aria-label={`Restore ${doc.name}`} onClick={() => restore(doc.id)}>
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button size="icon" variant="ghost" aria-label={`Delete ${doc.name}`} onClick={() => remove(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </ListPage>

      <DocumentVersionHistoryDialog document={versionsFor} onOpenChange={(open) => !open && setVersionsFor(undefined)} />
      <ReplaceDocumentFileDialog document={replaceFor} onOpenChange={(open) => !open && setReplaceFor(undefined)} />
    </>
  );
}
