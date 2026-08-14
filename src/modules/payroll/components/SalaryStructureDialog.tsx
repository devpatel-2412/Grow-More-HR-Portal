import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Wallet } from 'lucide-react';
import { useSetSalaryStructure } from '../hooks/usePayroll';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';

const salaryStructureSchema = z.object({
  employeeId: z.string().min(1, 'Pick an employee'),
  effectiveFrom: z.string().min(1, 'Required'),
  basicSalary: z.number().min(0, 'Cannot be negative'),
  hra: z.number().min(0, 'Cannot be negative'),
  allowance: z.number().min(0, 'Cannot be negative'),
});

type SalaryStructureFormValues = z.infer<typeof salaryStructureSchema>;

export function SalaryStructureDialog() {
  const [open, setOpen] = useState(false);
  const setMutation = useSetSalaryStructure();
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const canManage = useHasPermission('payroll:manage');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<SalaryStructureFormValues>({
    resolver: zodResolver(salaryStructureSchema),
    defaultValues: {
      employeeId: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      basicSalary: 0,
      hra: 0,
      allowance: 0,
    },
  });

  if (!canManage) return null;

  async function onSubmit(values: SalaryStructureFormValues) {
    try {
      await setMutation.mutateAsync(values);
      toast.success('Salary structure saved.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save the salary structure.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wallet className="h-4 w-4" />
          Set salary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salary structure</DialogTitle>
          <DialogDescription>
            Effective-dated, so past payslips keep the figures they were generated with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="structure-employee">Employee</Label>
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="structure-employee">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeePage?.data ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeId && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.employeeId.message}</p>}
          </div>

          <div>
            <Label htmlFor="structure-effective">Effective from</Label>
            <Input id="structure-effective" type="date" {...register('effectiveFrom')} />
            {errors.effectiveFrom && (
              <p className="mt-1 text-xs text-[var(--destructive)]">{errors.effectiveFrom.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="structure-basic">Basic</Label>
              <Input id="structure-basic" type="number" step="0.01" {...register('basicSalary', { valueAsNumber: true })} />
              {errors.basicSalary && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.basicSalary.message}</p>}
            </div>
            <div>
              <Label htmlFor="structure-hra">HRA</Label>
              <Input id="structure-hra" type="number" step="0.01" {...register('hra', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="structure-allowance">Allowance</Label>
              <Input id="structure-allowance" type="number" step="0.01" {...register('allowance', { valueAsNumber: true })} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" loading={setMutation.isPending}>
              Save structure
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
