import { api } from '../../../shared/lib/api-client';
import type {
  JobPostingRecord,
  CandidateRecord,
  InterviewRecord,
  JobPostingStatus,
  CandidateStatus,
  EmploymentType,
  InterviewMode,
  InterviewOutcome,
} from '../types/recruitment.types';

export interface CreateJobPostingPayload {
  title: string;
  description: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  openings: number;
  minExperience: number;
  salaryMin?: number;
  salaryMax?: number;
  closingDate?: string;
  status: JobPostingStatus;
}

export interface CreateCandidatePayload {
  jobPostingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  parsedSkills?: string;
  source?: string;
  notes?: string;
}

export interface ScheduleInterviewPayload {
  candidateId: string;
  interviewerId?: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  round: number;
  location?: string;
}

export const recruitmentApi = {
  createPosting: (payload: CreateJobPostingPayload) => api.post<JobPostingRecord>('/job-postings', payload),
  listPostings: (query: { page: number; limit: number; status?: JobPostingStatus; search?: string }) =>
    api.getPaginated<JobPostingRecord>('/job-postings', query),
  getPosting: (id: string) => api.get<JobPostingRecord>(`/job-postings/${id}`),
  updatePosting: (id: string, payload: Partial<CreateJobPostingPayload>) =>
    api.patch<JobPostingRecord>(`/job-postings/${id}`, payload),
  deletePosting: (id: string) => api.delete<void>(`/job-postings/${id}`),

  createCandidate: (payload: CreateCandidatePayload) => api.post<CandidateRecord>('/candidates', payload),
  listCandidates: (query: { page: number; limit: number; jobPostingId?: string; status?: CandidateStatus; search?: string }) =>
    api.getPaginated<CandidateRecord>('/candidates', query),
  getCandidate: (id: string) => api.get<CandidateRecord>(`/candidates/${id}`),
  changeStage: (id: string, status: CandidateStatus, rejectionReason?: string) =>
    api.patch<CandidateRecord>(`/candidates/${id}/stage`, { status, rejectionReason }),
  updateCandidate: (id: string, payload: { rating?: number; notes?: string }) =>
    api.patch<CandidateRecord>(`/candidates/${id}`, payload),

  scheduleInterview: (payload: ScheduleInterviewPayload) => api.post<InterviewRecord>('/interviews', payload),
  listInterviews: (query: { page: number; limit: number; candidateId?: string; outcome?: InterviewOutcome }) =>
    api.getPaginated<InterviewRecord>('/interviews', query),
  updateInterview: (id: string, payload: { outcome?: InterviewOutcome; rating?: number; feedback?: string }) =>
    api.patch<InterviewRecord>(`/interviews/${id}`, payload),
  cancelInterview: (id: string) => api.delete<void>(`/interviews/${id}`),
};
