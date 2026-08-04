import { History } from 'lucide-react';
import { useLifecycleEvents } from '../hooks/useLifecycle';
import {
  ConfirmEmployeeDialog,
  PromoteEmployeeDialog,
  TransferEmployeeDialog,
  InitiateExitDialog,
  CompleteExitDialog,
} from './LifecycleActionDialogs';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { EmployeeStatus } from '../../employees/types/employee.types';
import type { LifecycleEventType } from '../types/lifecycle.types';

const EVENT_LABELS: Record<LifecycleEventType, string> = {
  CONFIRMATION: 'Confirmed',
  PROMOTION: 'Promoted',
  TRANSFER: 'Transferred',
  EXIT_INITIATED: 'Exit initiated',
  EXIT_COMPLETED: 'Exit completed',
};

export function LifecycleEventsPanel({
  employeeId,
  employeeName,
  status,
  canManage,
}: {
  employeeId: string;
  employeeName: string;
  status: EmployeeStatus;
  canManage: boolean;
}) {
  const { data: events, isLoading, isError, refetch } = useLifecycleEvents(employeeId);

  return (
    <div className="space-y-4 p-4">
      {canManage && (
        <div className="flex flex-wrap gap-2">
          {status === 'ONBOARDING' && <ConfirmEmployeeDialog employeeId={employeeId} employeeName={employeeName} />}
          {status !== 'TERMINATED' && status !== 'RESIGNED' && (
            <>
              <PromoteEmployeeDialog employeeId={employeeId} employeeName={employeeName} />
              <TransferEmployeeDialog employeeId={employeeId} employeeName={employeeName} />
            </>
          )}
          {status === 'ACTIVE' && <InitiateExitDialog employeeId={employeeId} employeeName={employeeName} />}
          {status === 'OFFBOARDING' && <CompleteExitDialog employeeId={employeeId} employeeName={employeeName} />}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {isError && <ErrorState description="Failed to load lifecycle history." onRetry={() => refetch()} />}

      {!isLoading && !isError && (events ?? []).length === 0 && (
        <EmptyState icon={History} title="No lifecycle events yet" description="Promotions, transfers, and exit actions will appear here." />
      )}

      {!isLoading && !isError && (events ?? []).length > 0 && (
        <ol className="space-y-3 border-l border-[var(--border)] pl-4">
          {(events ?? []).map((event) => (
            <li key={event.id}>
              <div className="text-sm font-semibold text-[var(--foreground)]">{EVENT_LABELS[event.type]}</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Effective {new Date(event.effectiveDate).toLocaleDateString()}
                {event.notes && ` · ${event.notes}`}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
