import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  recruitmentApi,
  type CreateJobPostingPayload,
  type CreateCandidatePayload,
  type ScheduleInterviewPayload,
} from '../api/recruitment.api';
import type { JobPostingStatus, CandidateStatus, InterviewOutcome } from '../types/recruitment.types';

const RECRUITMENT_KEY = ['recruitment'];

export function useJobPostings(query: { page: number; limit: number; status?: JobPostingStatus; search?: string }) {
  return useQuery({
    queryKey: ['recruitment', 'postings', query],
    queryFn: () => recruitmentApi.listPostings(query),
    placeholderData: (previous) => previous,
  });
}

export function useJobPosting(id: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'posting', id],
    queryFn: () => recruitmentApi.getPosting(id!),
    enabled: !!id,
  });
}

export function useCandidates(query: {
  page: number;
  limit: number;
  jobPostingId?: string;
  status?: CandidateStatus;
  search?: string;
}) {
  return useQuery({
    queryKey: ['recruitment', 'candidates', query],
    queryFn: () => recruitmentApi.listCandidates(query),
    placeholderData: (previous) => previous,
  });
}

export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'candidate', id],
    queryFn: () => recruitmentApi.getCandidate(id!),
    enabled: !!id,
  });
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJobPostingPayload) => recruitmentApi.createPosting(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEY }),
  });
}

export function useUpdateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateJobPostingPayload>) =>
      recruitmentApi.updatePosting(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEY }),
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCandidatePayload) => recruitmentApi.createCandidate(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEY }),
  });
}

export function useChangeCandidateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: CandidateStatus; rejectionReason?: string }) =>
      recruitmentApi.changeStage(id, status, rejectionReason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEY }),
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScheduleInterviewPayload) => recruitmentApi.scheduleInterview(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEY }),
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; outcome?: InterviewOutcome; rating?: number; feedback?: string }) =>
      recruitmentApi.updateInterview(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECRUITMENT_KEY }),
  });
}
