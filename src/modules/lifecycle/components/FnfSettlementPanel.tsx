import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Wallet } from 'lucide-react';
import {
  useFnfSettlement,
  useCreateFnfSettlement,
  useUpdateFnfSettlement,
  useChangeFnfStatus,
} from '../hooks/useLifecycle';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Badge } from '../../../shared/components/ui/badge';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import type { FnfStatus } from '../types/lifecycle.types';

const fnfSchema = z.object({
  lastWorkingDay: z.string().min(1, 'Required'),
  pendingSalary: z.number().min(0, 'Cannot be negative'),
  leaveEncashment: z.number().min(0, 'Cannot be negative'),
  bonus: z.number().min(0, 'Cannot be negative'),
  deductions: z.number().min(0, 'Cannot be negative'),
  notes: z.string().max(2000).optional(),
});
type FnfFormValues = z.infer<typeof fnfSchema>;

const STATUS_VARIANT: Record<FnfStatus, 'neutral' | 'success' | 'warning'> = {
  DRAFT: 'neutral',
  APPROVED: 'warning',
  PAID: 'success',
};

export function FnfSettlementPanel({
  employeeId,
  employeeName,
  eligible,
  canManage,
}: {
  employeeId: string;
  employeeName: string;
  eligible: boolean;
  canManage: boolean;
}) {
  const { data: settlement, isLoading, isError, refetch } = useFnfSettlement(employeeId);
  const createMutation = useCreateFnfSettlement(employeeId);
  const updateMutation = useUpdateFnfSettlement(employeeId);
  const statusMutation = useChangeFnfStatus(employeeId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FnfFormValues>({
    resolver: zodResolver(fnfSchema),
    defaultValues: settlement
      ? {
          lastWorkingDay: settlement.lastWorkingDay.slice(0, 10),
          pendingSalary: settlement.pendingSalary,
          leaveEncashment: settlement.leaveEncashment,
          bonus: settlement.bonus,
          deductions: settlement.deductions,
          notes: settlement.notes ?? '',
        }
      : { lastWorkingDay: new Date().toISOString().slice(0, 10), pendingSalary: 0, leaveEncashment: 0, bonus: 0, deductions: 0 },
  });

  async function onSubmit(values: FnfFormValues) {
    try {
      if (settlement) {
        await updateMutation.mutateAsync(values);
        toast.success('F&F settlement updated.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('F&F settlement created.');
      }
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save this settlement.' });
    }
  }

  async function advance(status: FnfStatus) {
    try {
      await statusMutation.mutateAsync(status);
      toast.success(`Settlement marked ${status.toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update the settlement status.');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError) return <ErrorState description="Failed to load the F&F settlement." onRetry={() => refetch()} />;

  if (!eligible) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Wallet}
          title="Not yet eligible"
          description={`${employeeName}'s exit process must begin before a full & final settlement can be recorded.`}
        />
      </div>
    );
  }

  const editable = canManage && (!settlement || settlement.status === 'DRAFT');

  return (
    <div className="space-y-4 p-4">
      {settlement && (
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[settlement.status]}>{settlement.status}</Badge>
          <span className="text-sm font-semibold text-[var(--foreground)]">Net payable: {settlement.netPayable.toFixed(2)}</span>
          {canManage && settlement.status === 'DRAFT' && (
            <Button size="sm" variant="outline" onClick={() => advance('APPROVED')} loading={statusMutation.isPending}>
              Approve
            </Button>
          )}
          {canManage && settlement.status === 'APPROVED' && (
            <Button size="sm" variant="outline" onClick={() => advance('PAID')} loading={statusMutation.isPending}>
              Mark paid
            </Button>
          )}
        </div>
      )}

      {editable && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="fnf-lwd">Last working day</Label>
            <Input id="fnf-lwd" type="date" {...register('lastWorkingDay')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fnf-pending">Pending salary</Label>
              <Input id="fnf-pending" type="number" step="0.01" {...register('pendingSalary', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="fnf-leave">Leave encashment</Label>
              <Input id="fnf-leave" type="number" step="0.01" {...register('leaveEncashment', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="fnf-bonus">Bonus</Label>
              <Input id="fnf-bonus" type="number" step="0.01" {...register('bonus', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="fnf-deductions">Deductions</Label>
              <Input id="fnf-deductions" type="number" step="0.01" {...register('deductions', { valueAsNumber: true })} />
            </div>
          </div>
          <div>
            <Label htmlFor="fnf-notes">Notes</Label>
            <Textarea id="fnf-notes" rows={2} {...register('notes')} />
          </div>
          <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {settlement ? 'Save changes' : 'Create settlement'}
          </Button>
        </form>
      )}

      {!settlement && !canManage && (
        <EmptyState icon={Wallet} title="No settlement yet" description="HR has not recorded a full & final settlement yet." />
      )}
    </div>
  );
}
