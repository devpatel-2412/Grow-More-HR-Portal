import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { useUpdateTenant } from '../hooks/useUpdateTenant';
import { useForceLogoutAll } from '../../sessions/hooks/useForceLogoutAll';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import type { Tenant } from '../../auth/types/auth.types';

const NEVER = 'never';
const UNLIMITED = '';

const TIMEOUT_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
  { value: NEVER, label: 'Never Expire' },
];

const securitySettingsSchema = z.object({
  sessionTimeoutOption: z.string(),
  sessionWarningMinutes: z.number().int().min(1).max(60),
  rememberMeDurationDays: z.number().int().min(1).max(365),
  maxConcurrentSessionsInput: z.string(),
});
type SecuritySettingsFormValues = z.infer<typeof securitySettingsSchema>;

export function SecuritySettingsForm({ tenant }: { tenant: Tenant }) {
  const updateMutation = useUpdateTenant(tenant.id);
  const forceLogoutAllMutation = useForceLogoutAll();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SecuritySettingsFormValues>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      sessionTimeoutOption: tenant.sessionTimeoutMinutes == null ? NEVER : String(tenant.sessionTimeoutMinutes),
      sessionWarningMinutes: tenant.sessionWarningMinutes,
      rememberMeDurationDays: tenant.rememberMeDurationDays,
      maxConcurrentSessionsInput: tenant.maxConcurrentSessions == null ? UNLIMITED : String(tenant.maxConcurrentSessions),
    },
  });

  async function onSubmit(values: SecuritySettingsFormValues) {
    try {
      await updateMutation.mutateAsync({
        name: tenant.name,
        logoUrl: tenant.logoUrl ?? '',
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        font: tenant.font,
        sessionTimeoutMinutes: values.sessionTimeoutOption === NEVER ? null : Number(values.sessionTimeoutOption),
        sessionWarningMinutes: values.sessionWarningMinutes,
        rememberMeDurationDays: values.rememberMeDurationDays,
        maxConcurrentSessions: values.maxConcurrentSessionsInput === UNLIMITED ? null : Number(values.maxConcurrentSessionsInput),
      });
      toast.success('Security settings saved.');
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save security settings.' });
    }
  }

  async function handleForceLogoutAll() {
    if (!window.confirm(`End every active session for everyone in ${tenant.name}? Each person will need to log in again.`)) return;
    try {
      await forceLogoutAllMutation.mutateAsync();
      toast.success('Every session has been ended tenant-wide.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to force-logout all users.');
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="session-timeout">Session timeout</Label>
            <Controller
              control={control}
              name="sessionTimeoutOption"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="session-timeout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEOUT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Auto-logout after this much inactivity.</p>
          </div>
          <div>
            <Label htmlFor="warning-minutes">Warning before logout (minutes)</Label>
            <Input
              id="warning-minutes"
              type="number"
              min={1}
              max={60}
              {...register('sessionWarningMinutes', { valueAsNumber: true })}
            />
            {errors.sessionWarningMinutes && (
              <p className="mt-1 text-xs text-[var(--destructive)]">{errors.sessionWarningMinutes.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="remember-me-days">"Remember me" duration (days)</Label>
            <Input
              id="remember-me-days"
              type="number"
              min={1}
              max={365}
              {...register('rememberMeDurationDays', { valueAsNumber: true })}
            />
            {errors.rememberMeDurationDays && (
              <p className="mt-1 text-xs text-[var(--destructive)]">{errors.rememberMeDurationDays.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="max-sessions">Maximum concurrent sessions</Label>
            <Input id="max-sessions" type="number" min={1} placeholder="Unlimited" {...register('maxConcurrentSessionsInput')} />
          </div>
        </div>

        <Button type="submit" loading={updateMutation.isPending}>
          Save security settings
        </Button>
      </form>

      <div className="rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4">
        <h4 className="text-sm font-bold text-[var(--foreground)]">Force logout all users</h4>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Immediately ends every active session for every user in {tenant.name}, including your own. Everyone will need to
          log in again.
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-3"
          loading={forceLogoutAllMutation.isPending}
          onClick={handleForceLogoutAll}
        >
          Force logout all users
        </Button>
      </div>
    </div>
  );
}
