import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useJobPosting, useCandidates } from '../hooks/useRecruitment';
import { CandidateDialog } from '../components/CandidateDialog';
import { CandidatePipeline } from '../components/CandidatePipeline';
import { CandidateDetailDrawer } from '../components/CandidateDetailDrawer';
import { JobPostingStatusBadge, CandidateStatusBadge } from '../components/RecruitmentBadges';
import { Card } from '../../../shared/components/ui/card';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

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
    <div className="mx-auto max-w-7xl space-y-6">
      <Link to="/recruitment" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All postings
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{posting.title}</h1>
            <JobPostingStatusBadge status={posting.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {posting.department} · {posting.location} · {posting.openings}{' '}
            {posting.openings === 1 ? 'opening' : 'openings'}
          </p>
        </div>
        {id && <CandidateDialog jobPostingId={id} />}
      </div>

      <CandidatePipeline
        candidates={candidates}
        onOpenCandidate={(candidate) => setOpenCandidateId(candidate.id)}
      />

      {rejected.length > 0 && (
        <Card className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Rejected ({rejected.length})</h3>
          <ul className="space-y-1">
            {rejected.map((candidate) => (
              <li key={candidate.id} className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setOpenCandidateId(candidate.id)}
                  className="text-[var(--foreground)] hover:underline"
                >
                  {candidate.firstName} {candidate.lastName}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--muted-foreground)]">{candidate.rejectionReason ?? 'No reason given'}</span>
                  <CandidateStatusBadge status={candidate.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <CandidateDetailDrawer
        candidateId={openCandidateId}
        open={!!openCandidateId}
        onOpenChange={(next) => !next && setOpenCandidateId(undefined)}
      />
    </div>
  );
}
