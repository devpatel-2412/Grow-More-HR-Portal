import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { UploadCloud } from 'lucide-react';
import { useUploadDocument } from '../hooks/useWorkplace';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { FileDropzone } from '../../../shared/components/ui/file-dropzone';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { MAX_DOCUMENT_UPLOAD_BYTES, DOCUMENT_ACCEPT } from '../constants/upload.constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '../../../shared/components/ui/dialog';

const documentSchema = z.object({
  category: z.string().max(120).optional(),
  folderPath: z.string().min(1, 'Required').max(500),
});
type DocumentFormValues = z.infer<typeof documentSchema>;

export function UploadDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const uploadMutation = useUploadDocument();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { category: '', folderPath: '/' },
  });

  async function onSubmit(values: DocumentFormValues) {
    if (files.length === 0) {
      setFileError('Add at least one file.');
      return;
    }
    setFileError(null);
    try {
      await uploadMutation.mutateAsync({
        files,
        category: values.category || undefined,
        folderPath: values.folderPath,
        isDigitallySigned: false,
      });
      toast.success(files.length > 1 ? `${files.length} documents added.` : 'Document added.');
      reset();
      setFiles([]);
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add these documents.' });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          setFiles([]);
          setFileError(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadCloud className="h-4 w-4" />
          Add document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add documents</DialogTitle>
          <DialogDescription>Drop one or more files, or click to browse.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <FileDropzone
            files={files}
            onFilesChange={(next) => {
              setFiles(next);
              if (next.length > 0) setFileError(null);
            }}
            accept={DOCUMENT_ACCEPT}
            maxSizeBytes={MAX_DOCUMENT_UPLOAD_BYTES}
          />
          {fileError && <p className="text-xs text-[var(--destructive)]">{fileError}</p>}

          <div>
            <Label htmlFor="doc-category">Category (optional)</Label>
            <Input id="doc-category" placeholder="Policies" {...register('category')} />
          </div>

          <div>
            <Label htmlFor="doc-folder">Folder</Label>
            <Input id="doc-folder" placeholder="/hr" {...register('folderPath')} />
            {errors.folderPath && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.folderPath.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={uploadMutation.isPending}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
