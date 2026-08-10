import { useState } from 'react';
import { toast } from 'sonner';
import { LayoutTemplate, Trash2, FileOutput } from 'lucide-react';
import { useTemplates, useDeleteTemplate } from '../hooks/useHrAutomation';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateTemplateDialog } from '../components/CreateTemplateDialog';
import { GenerateDocumentDialog } from '../components/GenerateDocumentDialog';
import { TEMPLATE_TYPE_LABELS } from '../types/hrautomation.types';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';
import type { TemplateRecord } from '../types/hrautomation.types';

export function TemplatesPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTemplates({ page: pagination.page, limit: pagination.limit });
  const deleteMutation = useDeleteTemplate();
  const [generatingTemplate, setGeneratingTemplate] = useState<TemplateRecord | undefined>();
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  async function remove(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Template deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this template.');
    }
  }

  return (
    <>
      <ListPage
        title="Templates"
        subtitle="Posters and letters, filled automatically with employee data."
        actions={<CreateTemplateDialog />}
        state={state}
        errorProps={{ description: 'Failed to load templates.', onRetry: () => refetch() }}
        emptyProps={{ icon: LayoutTemplate, title: 'No templates yet', description: 'Create your first poster or letter.' }}
      >
        {data && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{TEMPLATE_TYPE_LABELS[template.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setGeneratingTemplate(template)}>
                          <FileOutput className="h-4 w-4" />
                          Generate
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Delete template" onClick={() => remove(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <GenerateDocumentDialog template={generatingTemplate} onOpenChange={(open) => !open && setGeneratingTemplate(undefined)} />
    </>
  );
}
