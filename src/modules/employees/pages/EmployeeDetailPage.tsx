import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useEmployee } from '../hooks/useEmployee';
import { useAuth } from '../../auth/context/AuthContext';
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge';
import { ChecklistPanel } from '../../lifecycle/components/ChecklistPanel';
import { LifecycleEventsPanel } from '../../lifecycle/components/LifecycleEventsPanel';
import { FnfSettlementPanel } from '../../lifecycle/components/FnfSettlementPanel';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { Button } from '../../../shared/components/ui/button';
import { DetailPageShell } from '../../../shared/components/layout/DetailPageShell';

type Tab = 'overview' | 'checklist' | 'lifecycle' | 'fnf';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const { data: employee, isLoading, isError, refetch } = useEmployee(id);
  const canManage = !!user && ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(user.role);
  const isSelf = user?.id === employee?.userId;
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !employee || !id) {
    return <ErrorState description="Failed to load this employee." onRetry={() => refetch()} />;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const exitEligible = employee.status === 'OFFBOARDING' || employee.status === 'TERMINATED' || employee.status === 'RESIGNED';

  return (
    <DetailPageShell
      maxWidth="5xl"
      breadcrumb={[{ label: 'Employees', to: '/employees' }, { label: fullName }]}
      title={fullName}
      badge={<EmployeeStatusBadge status={employee.status} />}
      subtitle={`${employee.employeeId} · ${employee.designation} · ${employee.department}`}
      activeTab={tab}
      onTabChange={(v) => setTab(v as Tab)}
      tabs={[
        {
          value: 'overview',
          label: 'Overview',
          content: (
            <div className="space-y-4">
              <div className="flex justify-end">
                {isSelf && !isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {isEditing && isSelf ? (
                <ProfileEditForm
                  employee={employee}
                  onSuccess={() => {
                    setIsEditing(false);
                    refetch();
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Phone</dt>
                    <dd className="text-[var(--foreground)]">{employee.phone ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Date of joining</dt>
                    <dd className="text-[var(--foreground)]">{new Date(employee.dateOfJoining).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Address</dt>
                    <dd className="text-[var(--foreground)]">{employee.address ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Emergency Contact</dt>
                    <dd className="text-[var(--foreground)]">{employee.emergencyContact ?? '—'}</dd>
                  </div>
                </dl>
              )}
            </div>
          ),
        },
        { value: 'checklist', label: 'Checklist', content: <ChecklistPanel employeeId={id} canManage={canManage} /> },
        {
          value: 'lifecycle',
          label: 'Lifecycle',
          content: <LifecycleEventsPanel employeeId={id} employeeName={fullName} status={employee.status} canManage={canManage} />,
        },
        {
          value: 'fnf',
          label: 'F&F settlement',
          content: <FnfSettlementPanel employeeId={id} employeeName={fullName} eligible={exitEligible} canManage={canManage} />,
        },
      ]}
    />
  );
}
