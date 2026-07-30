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
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
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
  name: z.string().min(1, 'Required').max(300),
  folderPath: z.string().min(1, 'Required').max(500),
  fileUrl: z.string().url('Enter a valid URL'),
});
type DocumentFormValues = z.infer<typeof documentSchema>;

export function UploadDocumentDialog() {
  const [open, setOpen] = useState(false);
  const uploadMutation = useUploadDocument();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: { name: '', folderPath: '/', fileUrl: '' },
  });

  async function onSubmit(values: DocumentFormValues) {
    try {
      await uploadMutation.mutateAsync({ ...values, isDigitallySigned: false });
      toast.success('Document added.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add this document.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadCloud className="h-4 w-4" />
          Add document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>Linked by URL — no file storage is wired up in this build.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="doc-name">Name</Label>
            <Input id="doc-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="doc-folder">Folder</Label>
            <Input id="doc-folder" placeholder="/hr" {...register('folderPath')} />
            {errors.folderPath && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.folderPath.message}</p>}
          </div>

          <div>
            <Label htmlFor="doc-url">File URL</Label>
            <Input id="doc-url" placeholder="https://…" {...register('fileUrl')} />
            {errors.fileUrl && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.fileUrl.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={uploadMutation.isPending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
