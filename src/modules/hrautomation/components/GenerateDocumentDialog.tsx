import { useState } from 'react';
import { toast } from 'sonner';
import { FileOutput, Download, Mail, FileType, Printer, Image as ImageIcon } from 'lucide-react';
import { useGenerateDocument } from '../hooks/useHrAutomation';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { templateApi } from '../api/hrautomation.api';
import { POSTER_TYPES } from '../types/hrautomation.types';
import { ApiError } from '../../../shared/lib/api-client';
import { downloadBlob } from '../../../shared/utils/blob-download';
import { PosterCanvas, renderPosterToPngDataUrl, type PosterCanvasField } from './PosterCanvas';
import { Button } from '../../../shared/components/ui/button';
import { Label } from '../../../shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import type { TemplateRecord } from '../types/hrautomation.types';

export function GenerateDocumentDialog({ template, onOpenChange }: { template: TemplateRecord | undefined; onOpenChange: (open: boolean) => void }) {
  const canGenerate = useHasPermission('template:manage');
  const generateMutation = useGenerateDocument();
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const [employeeId, setEmployeeId] = useState('');
  const [preview, setPreview] = useState<string | undefined>();
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  if (!canGenerate) return null;

  const isPoster = !!template && POSTER_TYPES.includes(template.type);
  let posterFields: PosterCanvasField[] = [];
  if (isPoster && preview) {
    try {
      posterFields = JSON.parse(preview) as PosterCanvasField[];
    } catch {
      posterFields = [];
    }
  }

  async function handleGenerate() {
    if (!template || !employeeId) return;
    try {
      const doc = await generateMutation.mutateAsync({ id: template.id, employeeId });
      setPreview(doc.renderedContent);
      setDocumentId(doc.id);
      toast.success('Document generated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to generate this document.');
    }
  }

  async function handleDownloadPdf() {
    if (!documentId) return;
    setDownloading(true);
    try {
      const { blob, filename } = await templateApi.downloadPdf(documentId);
      downloadBlob(filename, blob);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to download the PDF.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadDocx() {
    if (!documentId) return;
    setDownloadingDocx(true);
    try {
      const { blob, filename } = await templateApi.downloadDocx(documentId);
      downloadBlob(filename, blob);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to download the DOCX.');
    } finally {
      setDownloadingDocx(false);
    }
  }

  async function handlePrint() {
    if (!documentId) return;
    setPrinting(true);
    try {
      const { blob } = await templateApi.downloadPdf(documentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to open this document for printing.');
    } finally {
      setPrinting(false);
    }
  }

  async function handleDownloadPng() {
    if (!template?.backgroundUrl || posterFields.length === 0) return;
    setDownloadingPng(true);
    try {
      const dataUrl = await renderPosterToPngDataUrl(template.backgroundUrl, posterFields);
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(`${template.type.toLowerCase()}-${employeeId}.png`, blob);
    } catch {
      toast.error('Unable to export this poster as an image.');
    } finally {
      setDownloadingPng(false);
    }
  }

  async function handleEmail() {
    if (!documentId) return;
    setEmailing(true);
    try {
      const { to } = await templateApi.emailDocument(documentId);
      toast.success(`Emailed to ${to}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to email this document.');
    } finally {
      setEmailing(false);
    }
  }

  return (
    <Dialog
      open={!!template}
      onOpenChange={(next) => {
        if (!next) {
          setPreview(undefined);
          setDocumentId(undefined);
        }
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

          {preview && isPoster && template?.backgroundUrl && posterFields.length > 0 && (
            <div className="flex justify-center">
              <PosterCanvas backgroundUrl={template.backgroundUrl} fields={posterFields} />
            </div>
          )}

          {preview && !isPoster && (
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)]">
              {preview}
            </div>
          )}

          <DialogFooter className="flex-wrap">
            {documentId && isPoster && (
              <Button variant="outline" onClick={handleDownloadPng} loading={downloadingPng}>
                <ImageIcon className="h-4 w-4" />
                Download PNG
              </Button>
            )}
            {documentId && template && !POSTER_TYPES.includes(template.type) && (
              <>
                <Button variant="outline" onClick={handleDownloadPdf} loading={downloading}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadDocx} loading={downloadingDocx}>
                  <FileType className="h-4 w-4" />
                  Download DOCX
                </Button>
                <Button variant="outline" onClick={handlePrint} loading={printing}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleEmail} loading={emailing}>
                  <Mail className="h-4 w-4" />
                  Email to employee
                </Button>
              </>
            )}
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
