import { z } from 'zod';
import { JobPostingStatus, EmploymentType, CandidateStatus, InterviewMode, InterviewOutcome } from '@prisma/client';
import { paginationQuerySchema } from '../../shared/utils/pagination.util.js';

export const createJobPostingSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(20000),
    department: z.string().min(1).max(120),
    location: z.string().min(1).max(200),
    employmentType: z.nativeEnum(EmploymentType).default('FULL_TIME'),
    openings: z.number().int().min(1).max(1000).default(1),
    minExperience: z.number().int().min(0).max(60).default(0),
    salaryMin: z.number().min(0).max(1_000_000_000).optional(),
    salaryMax: z.number().min(0).max(1_000_000_000).optional(),
    closingDate: z.coerce.date().optional(),
    status: z.nativeEnum(JobPostingStatus).default('DRAFT'),
  })
  .refine((data) => data.salaryMin === undefined || data.salaryMax === undefined || data.salaryMax >= data.salaryMin, {
    message: 'Maximum salary must be at least the minimum',
    path: ['salaryMax'],
  });

export const updateJobPostingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(20000).optional(),
  department: z.string().min(1).max(120).optional(),
  location: z.string().min(1).max(200).optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  openings: z.number().int().min(1).max(1000).optional(),
  minExperience: z.number().int().min(0).max(60).optional(),
  salaryMin: z.number().min(0).max(1_000_000_000).nullable().optional(),
  salaryMax: z.number().min(0).max(1_000_000_000).nullable().optional(),
  closingDate: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(JobPostingStatus).optional(),
});

export const listJobPostingsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(JobPostingStatus).optional(),
  department: z.string().max(120).optional(),
  search: z.string().max(200).optional(),
});

export const createCandidateSchema = z.object({
  jobPostingId: z.string().uuid(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  resumeUrl: z.string().url().max(2000).optional(),
  parsedSkills: z.string().max(2000).optional(),
  source: z.string().max(120).optional(),
  notes: z.string().max(4000).optional(),
});

export const updateCandidateSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(40).nullable().optional(),
  resumeUrl: z.string().url().max(2000).nullable().optional(),
  parsedSkills: z.string().max(2000).nullable().optional(),
  source: z.string().max(120).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  rating: z.number().int().min(0).max(5).optional(),
});

export const changeCandidateStageSchema = z.object({
  status: z.nativeEnum(CandidateStatus),
  rejectionReason: z.string().max(1000).optional(),
});

export const listCandidatesQuerySchema = paginationQuerySchema.extend({
  jobPostingId: z.string().uuid().optional(),
  status: z.nativeEnum(CandidateStatus).optional(),
  search: z.string().max(200).optional(),
});

export const scheduleInterviewSchema = z.object({
  candidateId: z.string().uuid(),
  interviewerId: z.string().uuid().optional(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  mode: z.nativeEnum(InterviewMode).default('VIDEO'),
  round: z.number().int().min(1).max(20).default(1),
  location: z.string().max(300).optional(),
});

export const updateInterviewSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  mode: z.nativeEnum(InterviewMode).optional(),
  location: z.string().max(300).nullable().optional(),
  interviewerId: z.string().uuid().nullable().optional(),
  feedback: z.string().max(4000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  outcome: z.nativeEnum(InterviewOutcome).optional(),
});

export const listInterviewsQuerySchema = paginationQuerySchema.extend({
  candidateId: z.string().uuid().optional(),
  interviewerId: z.string().uuid().optional(),
  outcome: z.nativeEnum(InterviewOutcome).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
