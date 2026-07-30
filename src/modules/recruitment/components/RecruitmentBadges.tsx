import { Badge } from '../../../shared/components/ui/badge';
import type { JobPostingStatus, CandidateStatus, InterviewOutcome } from '../types/recruitment.types';

const POSTING_VARIANT: Record<JobPostingStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  CLOSED: 'danger',
};

const CANDIDATE_VARIANT: Record<CandidateStatus, 'neutral' | 'success' | 'warning' | 'info' | 'danger'> = {
  APPLIED: 'neutral',
  SCREENING: 'info',
  INTERVIEW: 'info',
  OFFER: 'warning',
  HIRED: 'success',
  REJECTED: 'danger',
};

const OUTCOME_VARIANT: Record<InterviewOutcome, 'neutral' | 'success' | 'danger'> = {
  PENDING: 'neutral',
  PASSED: 'success',
  FAILED: 'danger',
};

export const STAGE_LABEL: Record<CandidateStatus, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

export function JobPostingStatusBadge({ status }: { status: JobPostingStatus }) {
  return <Badge variant={POSTING_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return <Badge variant={CANDIDATE_VARIANT[status]}>{STAGE_LABEL[status]}</Badge>;
}

export function InterviewOutcomeBadge({ outcome }: { outcome: InterviewOutcome }) {
  return <Badge variant={OUTCOME_VARIANT[outcome]}>{outcome}</Badge>;
}
