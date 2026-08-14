import { Users } from 'lucide-react';
import { useLeads } from '../hooks/useCrm';
import { LeadDialog } from '../components/LeadDialog';
import { LeadPipelineBoard } from '../components/LeadPipelineBoard';
import { LeadStatusBadge } from '../components/CrmBadges';
import { Card } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function LeadsPage() {
  const { data, isLoading, isError, refetch } = useLeads({ page: 1, limit: 100 });

  const leads = data?.data ?? [];
  const closed = leads.filter((lead) => lead.status === 'WON' || lead.status === 'LOST');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">Leads</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Track prospects from first contact to conversion.</p>
        </div>
        <LeadDialog />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {isError && <ErrorState description="Failed to load leads." onRetry={() => refetch()} />}
      {!isLoading && !isError && leads.length === 0 && (
        <EmptyState icon={Users} title="No leads yet" description="Add your first lead to start the pipeline." />
      )}
      {!isLoading && !isError && leads.length > 0 && (
        <>
          <LeadPipelineBoard leads={leads} onOpenLead={() => {}} />

          {closed.length > 0 && (
            <Card className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Closed ({closed.length})</h3>
              <ul className="space-y-1">
                {closed.map((lead) => (
                  <li key={lead.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="text-[var(--foreground)]">{lead.companyName}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {lead.status === 'LOST' && (
                        <span className="text-[var(--muted-foreground)]">{lead.lostReason ?? 'No reason given'}</span>
                      )}
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
