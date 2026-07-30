import { useState } from 'react';
import { toast } from 'sonner';
import { FileOutput } from 'lucide-react';
import { useGenerateDocument } from '../hooks/useHrAutomation';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import type { TemplateRecord } from '../types/hrautomation.types';

export function GenerateDocumentDialog({ template, onOpenChange }: { template: TemplateRecord | undefined; onOpenChange: (open: boolean) => void }) {
  const generateMutation = useGenerateDocument();
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const [employeeId, setEmployeeId] = useState('');
  const [preview, setPreview] = useState<string | undefined>();

  async function handleGenerate() {
    if (!template || !employeeId) return;
    try {
      const doc = await generateMutation.mutateAsync({ id: template.id, employeeId });
      setPreview(doc.renderedContent);
      toast.success('Document generated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to generate this document.');
    }
  }

  return (
    <Dialog
      open={!!template}
      onOpenChange={(next) => {
        if (!next) setPreview(undefined);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate: {template?.name}</DialogTitle>
          <DialogDescription>Fills the template with a real employee's data.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="generate-employee">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="generate-employee">
                <SelectValue placeholder="Pick an employee" />
              </SelectTrigger>
              <SelectContent>
                {(employeePage?.data ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preview && (
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)]">
              {template && template.type.startsWith('POSTER') ? (
                <pre className="text-xs">{preview}</pre>
              ) : (
                preview
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleGenerate} loading={generateMutation.isPending} disabled={!employeeId}>
              <FileOutput className="h-4 w-4" />
              Generate
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
