import { useState } from 'react';
import { toast } from 'sonner';
import { useReplaceDocumentFile } from '../hooks/useWorkplace';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { FileDropzone } from '../../../shared/components/ui/file-dropzone';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { MAX_DOCUMENT_UPLOAD_BYTES, DOCUMENT_ACCEPT } from '../constants/upload.constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import type { DocumentRecord } from '../types/workplace.types';

export function ReplaceDocumentFileDialog({ document, onOpenChange }: { document: DocumentRecord | undefined; onOpenChange: (open: boolean) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replaceMutation = useReplaceDocumentFile();

  async function onSubmit() {
    if (!document) return;
    if (files.length === 0) {
      setError('Choose a file to upload.');
      return;
    }
    try {
      await replaceMutation.mutateAsync({ id: document.id, file: files[0] });
      toast.success(`Uploaded as version ${document.version + 1}.`);
      setFiles([]);
      setError(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to replace this file.');
    }
  }

  return (
    <Dialog
      open={!!document}
      onOpenChange={(next) => {
        if (!next) {
          setFiles([]);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace file: {document?.name}</DialogTitle>
          <DialogDescription>
            The current file becomes version {document?.version}, preserved in history — this uploads version {(document?.version ?? 0) + 1}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <InlineFormError message={error ?? undefined} />
          <FileDropzone
            files={files}
            onFilesChange={(next) => {
              setFiles(next);
              if (next.length > 0) setError(null);
            }}
            multiple={false}
            accept={DOCUMENT_ACCEPT}
            maxSizeBytes={MAX_DOCUMENT_UPLOAD_BYTES}
          />
          <DialogFooter>
            <Button type="button" loading={replaceMutation.isPending} onClick={onSubmit}>
              Upload new version
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
