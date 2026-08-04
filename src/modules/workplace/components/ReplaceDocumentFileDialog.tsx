import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { useReplaceDocumentFile } from '../hooks/useWorkplace';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import type { DocumentRecord } from '../types/workplace.types';

const replaceSchema = z.object({ fileUrl: z.string().url('Enter a valid URL') });
type ReplaceFormValues = z.infer<typeof replaceSchema>;

export function ReplaceDocumentFileDialog({ document, onOpenChange }: { document: DocumentRecord | undefined; onOpenChange: (open: boolean) => void }) {
  const replaceMutation = useReplaceDocumentFile();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ReplaceFormValues>({ resolver: zodResolver(replaceSchema), defaultValues: { fileUrl: '' } });

  async function onSubmit(values: ReplaceFormValues) {
    if (!document) return;
    try {
      await replaceMutation.mutateAsync({ id: document.id, fileUrl: values.fileUrl });
      toast.success(`Uploaded as version ${document.version + 1}.`);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to replace this file.' });
    }
  }

  return (
    <Dialog
      open={!!document}
      onOpenChange={(next) => {
        if (!next) reset();
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="replace-url">New file URL</Label>
            <Input id="replace-url" placeholder="https://…" {...register('fileUrl')} />
            {errors.fileUrl && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.fileUrl.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" loading={replaceMutation.isPending}>
              Upload new version
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
