import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  attendancePolicySchema,
  minutesToTimeString,
  timeStringToMinutes,
  type AttendancePolicyFormValues,
} from '../schemas/attendance.schemas';
import { useUpdateTenant } from '../../tenants/hooks/useUpdateTenant';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import type { Tenant } from '../../auth/types/auth.types';

export function AttendancePolicyForm({ tenant }: { tenant: Tenant }) {
  const updateMutation = useUpdateTenant(tenant.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<AttendancePolicyFormValues>({
    resolver: zodResolver(attendancePolicySchema),
    defaultValues: {
      shiftStartTime: minutesToTimeString(tenant.attendanceShiftStartMinutes),
      requiredWorkHours: tenant.attendanceRequiredWorkMinutes / 60,
      allowedBreakMinutes: tenant.attendanceAllowedBreakMinutes,
      breakOverageExtendsLogout: tenant.attendanceBreakOverageExtendsLogout,
    },
  });

  async function onSubmit(values: AttendancePolicyFormValues) {
    try {
      await updateMutation.mutateAsync({
        name: tenant.name,
        logoUrl: tenant.logoUrl ?? '',
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        font: tenant.font,
        attendanceShiftStartMinutes: timeStringToMinutes(values.shiftStartTime),
        attendanceRequiredWorkMinutes: values.requiredWorkHours * 60,
        attendanceAllowedBreakMinutes: values.allowedBreakMinutes,
        attendanceBreakOverageExtendsLogout: values.breakOverageExtendsLogout,
      });
      toast.success('Attendance policy saved.');
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save the attendance policy.' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <InlineFormError message={errors.root?.message} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="shift-start">Shift start time</Label>
          <Input id="shift-start" type="time" {...register('shiftStartTime')} />
          {errors.shiftStartTime && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.shiftStartTime.message}</p>}
        </div>
        <div>
          <Label htmlFor="required-hours">Required work hours</Label>
          <Input id="required-hours" type="number" step="0.5" {...register('requiredWorkHours', { valueAsNumber: true })} />
          {errors.requiredWorkHours && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.requiredWorkHours.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="allowed-break">Allowed break (minutes)</Label>
        <Input id="allowed-break" type="number" {...register('allowedBreakMinutes', { valueAsNumber: true })} />
        {errors.allowedBreakMinutes && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.allowedBreakMinutes.message}</p>}
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <input type="checkbox" className="rounded" {...register('breakOverageExtendsLogout')} />
        Extend required logout time when break time exceeds the allowance (otherwise it's just flagged)
      </label>
      <p className="text-[10px] text-[var(--muted-foreground)]">
        Example: with a {minutesToTimeString(tenant.attendanceShiftStartMinutes)} start and a{' '}
        {tenant.attendanceRequiredWorkMinutes / 60}h window, checking in 5 minutes late moves the required
        logout time 5 minutes later too.
      </p>
      <Button type="submit" loading={updateMutation.isPending}>
        Save attendance policy
      </Button>
    </form>
  );
}
