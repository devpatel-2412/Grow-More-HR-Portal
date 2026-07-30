export type JobPostingStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'CLOSED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
export type CandidateStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
export type InterviewMode = 'ONSITE' | 'PHONE' | 'VIDEO';
export type InterviewOutcome = 'PENDING' | 'PASSED' | 'FAILED';

export interface JobPostingRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  openings: number;
  minExperience: number;
  salaryMin: number | null;
  salaryMax: number | null;
  closingDate: string | null;
  status: JobPostingStatus;
  createdAt: string;
  /** Candidate counts keyed by stage — only present on the single-posting endpoint. */
  pipeline?: Partial<Record<CandidateStatus, number>>;
}

export interface CandidateRecord {
  id: string;
  tenantId: string;
  jobPostingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  parsedSkills: string | null;
  source: string | null;
  status: CandidateStatus;
  rating: number;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  interviews?: InterviewRecord[];
}

export interface InterviewRecord {
  id: string;
  tenantId: string;
  candidateId: string;
  interviewerId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  round: number;
  location: string | null;
  feedback: string | null;
  rating: number | null;
  outcome: InterviewOutcome;
  createdAt: string;
}

/** Mirrors the server's pipeline rules so the UI only offers moves the API will accept. */
export const STAGE_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  APPLIED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
};

export const PIPELINE_STAGES: CandidateStatus[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];
