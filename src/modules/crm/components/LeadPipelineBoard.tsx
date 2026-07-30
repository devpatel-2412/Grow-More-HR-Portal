import { toast } from 'sonner';
import { useChangeLeadStage } from '../hooks/useCrm';
import { LEAD_STAGE_LABEL } from './CrmBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { LEAD_TRANSITIONS, type LeadRecord, type LeadStatus } from '../types/crm.types';

const BOARD_STAGES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'];

/**
 * The active-funnel board. WON is deliberately not a column here — a lead only reaches WON via
 * conversion (a dedicated dialog, wired by the caller), never a plain stage change, so offering
 * it as a move-to target would promise something the server refuses.
 */
export function LeadPipelineBoard({
  leads,
  onOpenLead,
  onConvert,
}: {
  leads: LeadRecord[];
  onOpenLead: (lead: LeadRecord) => void;
  onConvert: (lead: LeadRecord) => void;
}) {
  const changeStage = useChangeLeadStage();

  async function move(lead: LeadRecord, status: LeadStatus) {
    try {
      await changeStage.mutateAsync({ id: lead.id, status });
      toast.success(`Moved to ${LEAD_STAGE_LABEL[status]}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to move this lead.');
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {BOARD_STAGES.map((stage) => {
        const inStage = leads.filter((lead) => lead.status === stage);
        return (
          <div key={stage} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                {LEAD_STAGE_LABEL[stage]}
              </span>
              <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">
                {inStage.length}
              </span>
            </div>

            <div className="space-y-2">
              {inStage.map((lead) => (
                <Card key={lead.id} className="space-y-2 p-3">
                  <button
                    type="button"
                    onClick={() => onOpenLead(lead)}
                    className="text-left text-sm font-semibold text-[var(--foreground)] hover:underline"
                  >
                    {lead.companyName}
                  </button>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{lead.contactName}</p>
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {lead.estimatedValue.toLocaleString()}
                  </p>

                  {stage === 'PROPOSAL' ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => move(lead, 'LOST')}>
                        Mark lost
                      </Button>
                      <Button size="sm" onClick={() => onConvert(lead)}>
                        Convert
                      </Button>
                    </div>
                  ) : (
                    LEAD_TRANSITIONS[lead.status].length > 0 && (
                      <Select value="" onValueChange={(next) => move(lead, next as LeadStatus)}>
                        <SelectTrigger aria-label={`Move ${lead.companyName}`}>
                          <SelectValue placeholder="Move to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_TRANSITIONS[lead.status].map((next) => (
                            <SelectItem key={next} value={next}>
                              {LEAD_STAGE_LABEL[next]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  )}
                </Card>
              ))}
              {inStage.length === 0 && (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--muted-foreground)]">
                  Empty
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
