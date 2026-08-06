import { useAuth } from '../../auth/context/AuthContext';
import { useTenant } from '../hooks/useTenant';
import { TenantBrandingForm } from '../components/TenantBrandingForm';
import { TaxSettingsForm } from '../components/TaxSettingsForm';
import { SecuritySettingsForm } from '../components/SecuritySettingsForm';
import { AttendancePolicyForm } from '../../attendance/components/AttendancePolicyForm';
import { Card } from '../../../shared/components/ui/card';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';

export function TenantSettingsPage() {
  const { tenant: sessionTenant } = useAuth();
  const { data: tenant, isLoading, isError, refetch } = useTenant(sessionTenant?.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Workspace settings</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Branding and policies for {sessionTenant?.name ?? 'your organization'}.</p>
      </div>

      {isLoading && (
        <Card>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      )}
      {isError && (
        <Card>
          <ErrorState description="Failed to load workspace settings." onRetry={() => refetch()} />
        </Card>
      )}
      {!isLoading && !isError && tenant && (
        <>
          <Card>
            <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Branding</h3>
            <TenantBrandingForm tenant={tenant} />
          </Card>
          <Card>
            <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Attendance policy</h3>
            <AttendancePolicyForm tenant={tenant} />
          </Card>
          <Card>
            <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Tax settings</h3>
            <TaxSettingsForm tenant={tenant} />
          </Card>
          <Card>
            <h3 className="mb-4 text-sm font-bold text-[var(--foreground)]">Security &amp; session management</h3>
            <SecuritySettingsForm tenant={tenant} />
          </Card>
        </>
      )}
    </div>
  );
}
