import { useState } from 'react';
import { toast } from 'sonner';
import { useCandidate, useScheduleInterview, useUpdateInterview } from '../hooks/useRecruitment';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { CandidateStatusBadge, InterviewOutcomeBadge } from './RecruitmentBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../shared/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { InterviewMode } from '../types/recruitment.types';

const NO_INTERVIEWER = '__none__';

function localInputValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CandidateDetailDrawer({
  candidateId,
  open,
  onOpenChange,
}: {
  candidateId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: candidate, isLoading } = useCandidate(open ? candidateId : undefined);
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const scheduleMutation = useScheduleInterview();
  const updateInterview = useUpdateInterview();
  const canManage = useHasPermission('recruitment:manage');

  const [scheduledAt, setScheduledAt] = useState(localInputValue(new Date()));
  const [interviewerId, setInterviewerId] = useState(NO_INTERVIEWER);
  const [mode, setMode] = useState<InterviewMode>('VIDEO');

  async function schedule() {
    if (!candidateId) return;
    try {
      await scheduleMutation.mutateAsync({
        candidateId,
        interviewerId: interviewerId === NO_INTERVIEWER ? undefined : interviewerId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: 60,
        mode,
        round: (candidate?.interviews?.length ?? 0) + 1,
      });
      toast.success('Interview scheduled.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to schedule this interview.');
    }
  }

  async function recordOutcome(id: string, outcome: 'PASSED' | 'FAILED') {
    try {
      await updateInterview.mutateAsync({ id, outcome });
      toast.success(`Marked as ${outcome.toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to record the outcome.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {isLoading || !candidate ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {candidate.firstName} {candidate.lastName}
                <CandidateStatusBadge status={candidate.status} />
              </DialogTitle>
              <DialogDescription>{candidate.email}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="font-semibold text-[var(--muted-foreground)]">Phone</dt>
                  <dd className="text-[var(--foreground)]">{candidate.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--muted-foreground)]">Source</dt>
                  <dd className="text-[var(--foreground)]">{candidate.source ?? '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold text-[var(--muted-foreground)]">Skills</dt>
                  <dd className="text-[var(--foreground)]">{candidate.parsedSkills ?? '—'}</dd>
                </div>
                {candidate.resumeUrl && (
                  <div className="col-span-2">
                    <dt className="font-semibold text-[var(--muted-foreground)]">Resume</dt>
                    <dd>
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[var(--primary)] hover:underline"
                      >
                        Open resume
                      </a>
                    </dd>
                  </div>
                )}
                {candidate.rejectionReason && (
                  <div className="col-span-2">
                    <dt className="font-semibold text-[var(--muted-foreground)]">Rejection reason</dt>
                    <dd className="text-[var(--foreground)]">{candidate.rejectionReason}</dd>
                  </div>
                )}
              </dl>

              <div className="space-y-2 border-t border-[var(--border)] pt-4">
                <h4 className="text-sm font-bold text-[var(--foreground)]">Interviews</h4>
                {(candidate.interviews ?? []).length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">No interviews scheduled.</p>
                )}
                {(candidate.interviews ?? []).map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] p-2"
                  >
                    <div className="text-xs">
                      <p className="font-semibold text-[var(--foreground)]">
                        Round {interview.round} · {interview.mode}
                      </p>
                      <p className="text-[var(--muted-foreground)]">
                        {new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes}m
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <InterviewOutcomeBadge outcome={interview.outcome} />
                      {canManage && interview.outcome === 'PENDING' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => recordOutcome(interview.id, 'FAILED')}>
                            Fail
                          </Button>
                          <Button size="sm" onClick={() => recordOutcome(interview.id, 'PASSED')}>
                            Pass
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {canManage && candidate.status !== 'HIRED' && candidate.status !== 'REJECTED' && (
                <div className="space-y-3 border-t border-[var(--border)] pt-4">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Schedule an interview</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="interview-when">When</Label>
                      <Input
                        id="interview-when"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="interview-mode">Mode</Label>
                      <Select value={mode} onValueChange={(value) => setMode(value as InterviewMode)}>
                        <SelectTrigger id="interview-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="PHONE">Phone</SelectItem>
                          <SelectItem value="ONSITE">Onsite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="interview-panel">Interviewer</Label>
                    <Select value={interviewerId} onValueChange={setInterviewerId}>
                      <SelectTrigger id="interview-panel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_INTERVIEWER}>Unassigned</SelectItem>
                        {(employeePage?.data ?? []).map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={schedule} loading={scheduleMutation.isPending}>
                      Schedule
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
