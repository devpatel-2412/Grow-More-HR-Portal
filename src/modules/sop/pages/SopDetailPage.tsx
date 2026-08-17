import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { History } from 'lucide-react';
import { useSop, useUpdateSop, usePublishSop, useArchiveSop, useSopRevisions } from '../hooks/useSop';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { SopStatusBadge } from '../components/SopStatusBadge';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Textarea } from '../../../shared/components/ui/textarea';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { DetailPageShell } from '../../../shared/components/layout/DetailPageShell';

const bodySchema = z.object({ body: z.string().min(1, 'Required').max(50000) });
type BodyFormValues = z.infer<typeof bodySchema>;

export function SopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sop, isLoading, isError, refetch } = useSop(id);
  const { data: revisions } = useSopRevisions(id);
  const updateMutation = useUpdateSop();
  const publishMutation = usePublishSop();
  const archiveMutation = useArchiveSop();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const canManage = useHasPermission('sop:manage');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<BodyFormValues>({ resolver: zodResolver(bodySchema), values: sop ? { body: sop.body } : undefined });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !sop || !id) {
    return <ErrorState description="Failed to load this SOP." onRetry={() => refetch()} />;
  }

  async function onSaveBody(values: BodyFormValues) {
    try {
      await updateMutation.mutateAsync({ id: id!, values: { body: values.body } });
      toast.success(sop!.status === 'PUBLISHED' ? 'Revision saved.' : 'Draft updated.');
      setEditing(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save this SOP.' });
    }
  }

  async function publish() {
    try {
      await publishMutation.mutateAsync(id!);
      toast.success('SOP published.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to publish this SOP.');
    }
  }

  async function archive() {
    try {
      await archiveMutation.mutateAsync(id!);
      toast.success('SOP archived.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to archive this SOP.');
    }
  }

  return (
    <DetailPageShell
      maxWidth="3xl"
      breadcrumb={[{ label: 'SOP Library', to: '/sops' }, { label: sop.title }]}
      title={sop.title}
      badge={<SopStatusBadge status={sop.status} />}
      subtitle={`v${sop.version} · ${sop.category ?? 'Uncategorized'} · ${sop.department ?? 'All departments'}`}
      actions={
        canManage ? (
          <>
            {sop.status === 'DRAFT' && (
              <Button size="sm" onClick={publish} loading={publishMutation.isPending}>
                Publish
              </Button>
            )}
            {sop.status === 'PUBLISHED' && (
              <Button size="sm" variant="outline" onClick={archive} loading={archiveMutation.isPending}>
                Archive
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Procedure</h3>
            <div className="flex gap-2">
              {canManage && sop.status !== 'ARCHIVED' && !editing && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowHistory((v) => !v)}>
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit(onSaveBody)} className="space-y-3" noValidate>
              <InlineFormError message={errors.root?.message} />
              <Textarea rows={14} {...register('body')} />
              {errors.body && <p className="text-xs text-[var(--destructive)]">{errors.body.message}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={updateMutation.isPending}>
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    reset({ body: sop.body });
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{sop.body}</p>
          )}
        </Card>

        {showHistory && (
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Revision history</h3>
            {(revisions ?? []).length === 0 && (
              <EmptyState icon={History} title="No prior revisions" description="This SOP hasn't been revised since it was published." />
            )}
            {(revisions ?? []).map((rev) => (
              <details key={rev.id} className="rounded-lg border border-[var(--border)] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                  v{rev.version} · {new Date(rev.createdAt).toLocaleString()}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs text-[var(--muted-foreground)]">{rev.body}</p>
              </details>
            ))}
          </Card>
        )}
      </div>
    </DetailPageShell>
  );
}
