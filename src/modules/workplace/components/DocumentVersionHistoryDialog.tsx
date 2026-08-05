import { History } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentVersions, useDownloadDocumentVersion } from '../hooks/useWorkplace';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../shared/components/ui/dialog';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import type { DocumentRecord } from '../types/workplace.types';

export function DocumentVersionHistoryDialog({ document, onOpenChange }: { document: DocumentRecord | undefined; onOpenChange: (open: boolean) => void }) {
  const { data: versions, isLoading } = useDocumentVersions(document?.id);
  const downloadVersionMutation = useDownloadDocumentVersion();

  async function downloadVersion(versionId: string) {
    if (!document) return;
    try {
      const { url, fileName } = await downloadVersionMutation.mutateAsync({ id: document.id, versionId });
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noopener';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to download this version.');
    }
  }

  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version history: {document?.name}</DialogTitle>
          <DialogDescription>Every prior file behind this document, newest first.</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && versions && versions.length === 0 && (
          <EmptyState icon={History} title="No version history" description="This document has no recorded versions yet." />
        )}

        {!isLoading && versions && versions.length > 0 && (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Version {v.version}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {v.uploadedBy ? `${v.uploadedBy.firstName} ${v.uploadedBy.lastName}` : 'Unknown uploader'} &middot;{' '}
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => downloadVersion(v.id)}>
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
