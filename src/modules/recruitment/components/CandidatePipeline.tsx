import { toast } from 'sonner';
import { useChangeCandidateStage } from '../hooks/useRecruitment';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { STAGE_LABEL } from './RecruitmentBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { PIPELINE_STAGES, STAGE_TRANSITIONS, type CandidateRecord, type CandidateStatus } from '../types/recruitment.types';

/**
 * Stage board. The move-to dropdown only lists transitions the server will accept, so an
 * illegal jump is never offered rather than being offered and then rejected.
 */
export function CandidatePipeline({
  candidates,
  onOpenCandidate,
}: {
  candidates: CandidateRecord[];
  onOpenCandidate: (candidate: CandidateRecord) => void;
}) {
  const changeStage = useChangeCandidateStage();
  const canManage = useHasPermission('recruitment:manage');

  async function move(candidate: CandidateRecord, status: CandidateStatus) {
    try {
      await changeStage.mutateAsync({ id: candidate.id, status });
      toast.success(`Moved to ${STAGE_LABEL[status]}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to move this candidate.');
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {PIPELINE_STAGES.map((stage) => {
        const inStage = candidates.filter((candidate) => candidate.status === stage);
        return (
          <div key={stage} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                {STAGE_LABEL[stage]}
              </span>
              <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">
                {inStage.length}
              </span>
            </div>

            <div className="space-y-2">
              {inStage.map((candidate) => (
                <Card key={candidate.id} className="space-y-2 p-3">
                  <button
                    type="button"
                    onClick={() => onOpenCandidate(candidate)}
                    className="text-left text-sm font-semibold text-[var(--foreground)] hover:underline"
                  >
                    {candidate.firstName} {candidate.lastName}
                  </button>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{candidate.email}</p>

                  {canManage && STAGE_TRANSITIONS[candidate.status].length > 0 && (
                    <Select value="" onValueChange={(next) => move(candidate, next as CandidateStatus)}>
                      <SelectTrigger aria-label={`Move ${candidate.firstName} ${candidate.lastName}`}>
                        <SelectValue placeholder="Move to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGE_TRANSITIONS[candidate.status].map((next) => (
                          <SelectItem key={next} value={next}>
                            {STAGE_LABEL[next]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
