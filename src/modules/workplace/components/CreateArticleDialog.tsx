import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { FilePlus2 } from 'lucide-react';
import { useCreateKbArticle } from '../hooks/useWorkplace';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Textarea } from '../../../shared/components/ui/textarea';
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

const articleSchema = z.object({
  title: z.string().min(1, 'Required').max(300),
  category: z.string().min(1, 'Required').max(120),
  content: z.string().min(1, 'Required').max(50000),
});
type ArticleFormValues = z.infer<typeof articleSchema>;

export function CreateArticleDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateKbArticle();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: { title: '', category: '', content: '' },
  });

  async function onSubmit(values: ArticleFormValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Article published.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to publish this article.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" />
          New article
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New knowledge base article</DialogTitle>
          <DialogDescription>Visible to every employee once published.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="article-title">Title</Label>
            <Input id="article-title" {...register('title')} />
            {errors.title && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="article-category">Category</Label>
            <Input id="article-category" placeholder="HR, IT, Finance…" {...register('category')} />
            {errors.category && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.category.message}</p>}
          </div>

          <div>
            <Label htmlFor="article-content">Content</Label>
            <Textarea id="article-content" rows={8} {...register('content')} />
            {errors.content && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.content.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
