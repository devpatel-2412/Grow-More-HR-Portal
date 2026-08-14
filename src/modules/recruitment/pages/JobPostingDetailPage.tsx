import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useJobPosting, useCandidates } from '../hooks/useRecruitment';
import { CandidateDialog } from '../components/CandidateDialog';
import { CandidatePipeline } from '../components/CandidatePipeline';
import { CandidateDetailDrawer } from '../components/CandidateDetailDrawer';
import { JobPostingStatusBadge, CandidateStatusBadge } from '../components/RecruitmentBadges';
import { Card } from '../../../shared/components/ui/card';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { DetailPageShell } from '../../../shared/components/layout/DetailPageShell';

export function JobPostingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: posting, isLoading, isError, refetch } = useJobPosting(id);
  const { data: candidatePage } = useCandidates({ page: 1, limit: 100, jobPostingId: id });
  const [openCandidateId, setOpenCandidateId] = useState<string | undefined>();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !posting) return <ErrorState description="Failed to load this posting." onRetry={() => refetch()} />;

  const candidates = candidatePage?.data ?? [];
  const rejected = candidates.filter((candidate) => candidate.status === 'REJECTED');

  return (
    <>
      <DetailPageShell
        maxWidth="6xl"
        breadcrumb={[{ label: 'Recruitment', to: '/recruitment' }, { label: posting.title }]}
        title={posting.title}
        badge={<JobPostingStatusBadge status={posting.status} />}
        subtitle={`${posting.department} · ${posting.location} · ${posting.openings} ${posting.openings === 1 ? 'opening' : 'openings'}`}
        actions={id ? <CandidateDialog jobPostingId={id} /> : undefined}
      >
        <div className="space-y-6">
          <CandidatePipeline candidates={candidates} onOpenCandidate={(candidate) => setOpenCandidateId(candidate.id)} />

          {rejected.length > 0 && (
            <Card className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Rejected ({rejected.length})</h3>
              <ul className="space-y-1">
                {rejected.map((candidate) => (
                  <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <button type="button" onClick={() => setOpenCandidateId(candidate.id)} className="text-[var(--foreground)] hover:underline">
                      {candidate.firstName} {candidate.lastName}
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[var(--muted-foreground)]">{candidate.rejectionReason ?? 'No reason given'}</span>
                      <CandidateStatusBadge status={candidate.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </DetailPageShell>

      <CandidateDetailDrawer candidateId={openCandidateId} open={!!openCandidateId} onOpenChange={(next) => !next && setOpenCandidateId(undefined)} />
    </>
  );
}
