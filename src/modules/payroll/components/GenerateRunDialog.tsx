import { useState } from 'react';
import { toast } from 'sonner';
import { Play } from 'lucide-react';
import { useGeneratePayrollRun } from '../hooks/usePayroll';
import { MONTH_NAMES } from './PayrollStatusBadge';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

export function GenerateRunDialog() {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [error, setError] = useState<string | undefined>();
  const generateMutation = useGeneratePayrollRun();

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  async function handleGenerate() {
    setError(undefined);
    try {
      await generateMutation.mutateAsync({ month: Number(month), year: Number(year) });
      toast.success('Payroll run generated as a draft.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to generate the payroll run.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Play className="h-4 w-4" />
          Generate run
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate payroll run</DialogTitle>
          <DialogDescription>
            Builds a draft payslip for every active employee with a salary structure. Nothing is paid until you approve
            and mark the run as paid.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <InlineFormError message={error} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="run-month">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="run-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, index) => (
                    <SelectItem key={name} value={String(index + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="run-year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="run-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleGenerate} loading={generateMutation.isPending}>
              Generate
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
