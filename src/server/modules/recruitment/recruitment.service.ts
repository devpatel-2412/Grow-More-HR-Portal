import { JobPostingRepository, CandidateRepository, InterviewRepository } from './recruitment.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta } from '../../shared/utils/pagination.util.js';
import { prisma } from '../../db/prisma.js';
import type { CandidateStatus } from '@prisma/client';
import type { z } from 'zod';
import type {
  createJobPostingSchema,
  updateJobPostingSchema,
  listJobPostingsQuerySchema,
  createCandidateSchema,
  updateCandidateSchema,
  listCandidatesQuerySchema,
  scheduleInterviewSchema,
  updateInterviewSchema,
  listInterviewsQuerySchema,
} from './recruitment.validators.js';

export interface RequestMeta {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * The hiring pipeline. Candidates move forward one stage at a time, may be rejected from any
 * live stage, and HIRED/REJECTED are terminal — reopening a closed candidate would silently
 * invalidate offer and headcount decisions already taken downstream.
 */
const STAGE_TRANSITIONS: Record<CandidateStatus, CandidateStatus[]> = {
  APPLIED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['OFFER', 'REJECTED'],
  OFFER: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: [],
};

export function canTransition(from: CandidateStatus, to: CandidateStatus): boolean {
  return STAGE_TRANSITIONS[from].includes(to);
}

export function overlaps(aStart: Date, aMinutes: number, bStart: Date, bMinutes: number): boolean {
  const aEnd = aStart.getTime() + aMinutes * 60000;
  const bEnd = bStart.getTime() + bMinutes * 60000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

export class RecruitmentService {
  constructor(
    private readonly postingRepository: JobPostingRepository = new JobPostingRepository(),
    private readonly candidateRepository: CandidateRepository = new CandidateRepository(),
    private readonly interviewRepository: InterviewRepository = new InterviewRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
  ) {}

  // ---------------------------------------------------------------- job postings

  async createPosting(tenantId: string, input: z.infer<typeof createJobPostingSchema>, meta: RequestMeta) {
    const posting = await this.postingRepository.create({ tenant: { connect: { id: tenantId } }, ...input });
    await this.audit(tenantId, meta, 'JOB_POSTING_CREATED', 'JobPosting', posting.id);
    return posting;
  }

  async requirePosting(tenantId: string, id: string) {
    const posting = await this.postingRepository.findById(id);
    if (!posting || posting.tenantId !== tenantId) throw new NotFoundError('Job posting not found');
    return posting;
  }

  async getPosting(tenantId: string, id: string) {
    const posting = await this.requirePosting(tenantId, id);
    const pipeline = await this.postingRepository.countByStage(id);
    return { ...posting, pipeline };
  }

  async updatePosting(tenantId: string, id: string, input: z.infer<typeof updateJobPostingSchema>, meta: RequestMeta) {
    const posting = await this.requirePosting(tenantId, id);

    const salaryMin = input.salaryMin === undefined ? posting.salaryMin : input.salaryMin;
    const salaryMax = input.salaryMax === undefined ? posting.salaryMax : input.salaryMax;
    if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
      throw new ValidationError('Maximum salary must be at least the minimum');
    }

    const updated = await this.postingRepository.update(id, input);
    await this.audit(tenantId, meta, 'JOB_POSTING_UPDATED', 'JobPosting', id);
    return updated;
  }

  async deletePosting(tenantId: string, id: string, meta: RequestMeta) {
    await this.requirePosting(tenantId, id);
    await this.postingRepository.delete(id);
    await this.audit(tenantId, meta, 'JOB_POSTING_DELETED', 'JobPosting', id);
  }

  async listPostings(tenantId: string, query: z.infer<typeof listJobPostingsQuerySchema>) {
    const { rows, total } = await this.postingRepository.findMany(
      tenantId,
      { status: query.status, department: query.department, search: query.search },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ---------------------------------------------------------------- candidates

  async createCandidate(tenantId: string, input: z.infer<typeof createCandidateSchema>, meta: RequestMeta) {
    const posting = await this.requirePosting(tenantId, input.jobPostingId);
    if (posting.status === 'CLOSED') throw new ConflictError('This job posting is closed to new applicants');

    const existing = await this.candidateRepository.findByPostingAndEmail(input.jobPostingId, input.email);
    if (existing) throw new ConflictError('This candidate has already applied to this posting');

    const { jobPostingId, ...rest } = input;
    const candidate = await this.candidateRepository.create({
      tenant: { connect: { id: tenantId } },
      jobPosting: { connect: { id: jobPostingId } },
      ...rest,
    });

    await this.audit(tenantId, meta, 'CANDIDATE_CREATED', 'Candidate', candidate.id);
    return candidate;
  }

  async requireCandidate(tenantId: string, id: string) {
    const candidate = await this.candidateRepository.findById(id);
    if (!candidate || candidate.tenantId !== tenantId) throw new NotFoundError('Candidate not found');
    return candidate;
  }

  async getCandidate(tenantId: string, id: string) {
    const candidate = await this.requireCandidate(tenantId, id);
    const interviews = await this.interviewRepository.findByCandidate(id);
    return { ...candidate, interviews };
  }

  async updateCandidate(tenantId: string, id: string, input: z.infer<typeof updateCandidateSchema>, meta: RequestMeta) {
    await this.requireCandidate(tenantId, id);
    const updated = await this.candidateRepository.update(id, input);
    await this.audit(tenantId, meta, 'CANDIDATE_UPDATED', 'Candidate', id);
    return updated;
  }

  /**
   * Moves a candidate one step along the pipeline. Hiring is additionally capped by the posting's
   * open headcount so a role cannot be over-filled by two recruiters acting at the same time.
   */
  async changeStage(
    tenantId: string,
    id: string,
    status: CandidateStatus,
    rejectionReason: string | undefined,
    meta: RequestMeta,
  ) {
    const candidate = await this.requireCandidate(tenantId, id);

    if (candidate.status === status) throw new ConflictError(`Candidate is already at the ${status} stage`);
    if (!canTransition(candidate.status, status)) {
      throw new ConflictError(`A candidate at ${candidate.status} cannot move to ${status}`);
    }

    if (status === 'HIRED') {
      const posting = await this.requirePosting(tenantId, candidate.jobPostingId);
      const hired = await prisma.candidate.count({ where: { jobPostingId: candidate.jobPostingId, status: 'HIRED' } });
      if (hired >= posting.openings) {
        throw new ConflictError('All openings for this posting are already filled');
      }
    }

    const updated = await this.candidateRepository.update(id, {
      status,
      rejectionReason: status === 'REJECTED' ? rejectionReason : null,
    });

    await this.audit(tenantId, meta, 'CANDIDATE_STAGE_CHANGED', 'Candidate', id);
    return updated;
  }

  async deleteCandidate(tenantId: string, id: string, meta: RequestMeta) {
    await this.requireCandidate(tenantId, id);
    await this.candidateRepository.delete(id);
    await this.audit(tenantId, meta, 'CANDIDATE_DELETED', 'Candidate', id);
  }

  async listCandidates(tenantId: string, query: z.infer<typeof listCandidatesQuerySchema>) {
    const { rows, total } = await this.candidateRepository.findMany(
      tenantId,
      { jobPostingId: query.jobPostingId, status: query.status, search: query.search },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  // ---------------------------------------------------------------- interviews

  private async assertInterviewerFree(
    interviewerId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeId?: string,
  ) {
    const end = new Date(scheduledAt.getTime() + durationMinutes * 60000);
    const nearby = await this.interviewRepository.findNearby(interviewerId, scheduledAt, end, excludeId);
    const clash = nearby.find((other) => overlaps(scheduledAt, durationMinutes, other.scheduledAt, other.durationMinutes));
    if (clash) throw new ConflictError('That interviewer already has an interview scheduled in this slot');
  }

  async scheduleInterview(tenantId: string, input: z.infer<typeof scheduleInterviewSchema>, meta: RequestMeta) {
    const candidate = await this.requireCandidate(tenantId, input.candidateId);
    if (candidate.status === 'HIRED' || candidate.status === 'REJECTED') {
      throw new ConflictError('Cannot schedule an interview for a closed candidate');
    }

    if (input.interviewerId) {
      const interviewer = await this.employeeRepository.findById(input.interviewerId);
      if (!interviewer || interviewer.tenantId !== tenantId) throw new NotFoundError('Interviewer not found');
      await this.assertInterviewerFree(input.interviewerId, input.scheduledAt, input.durationMinutes);
    }

    const { candidateId, interviewerId, ...rest } = input;
    const interview = await this.interviewRepository.create({
      tenant: { connect: { id: tenantId } },
      candidate: { connect: { id: candidateId } },
      interviewer: interviewerId ? { connect: { id: interviewerId } } : undefined,
      ...rest,
    });

    await this.audit(tenantId, meta, 'INTERVIEW_SCHEDULED', 'Interview', interview.id);
    return interview;
  }

  async updateInterview(tenantId: string, id: string, input: z.infer<typeof updateInterviewSchema>, meta: RequestMeta) {
    const interview = await this.interviewRepository.findById(id);
    if (!interview || interview.tenantId !== tenantId) throw new NotFoundError('Interview not found');

    const interviewerId = input.interviewerId === undefined ? interview.interviewerId : input.interviewerId;
    const scheduledAt = input.scheduledAt ?? interview.scheduledAt;
    const durationMinutes = input.durationMinutes ?? interview.durationMinutes;

    const rescheduled = input.scheduledAt !== undefined || input.durationMinutes !== undefined;
    const reassigned = input.interviewerId !== undefined;
    if (interviewerId && (rescheduled || reassigned)) {
      await this.assertInterviewerFree(interviewerId, scheduledAt, durationMinutes, id);
    }

    const { interviewerId: _ignored, ...rest } = input;
    const updated = await this.interviewRepository.update(id, {
      ...rest,
      interviewer:
        input.interviewerId === undefined
          ? undefined
          : input.interviewerId === null
            ? { disconnect: true }
            : { connect: { id: input.interviewerId } },
    });

    await this.audit(tenantId, meta, 'INTERVIEW_UPDATED', 'Interview', id);
    return updated;
  }

  async cancelInterview(tenantId: string, id: string, meta: RequestMeta) {
    const interview = await this.interviewRepository.findById(id);
    if (!interview || interview.tenantId !== tenantId) throw new NotFoundError('Interview not found');
    await this.interviewRepository.delete(id);
    await this.audit(tenantId, meta, 'INTERVIEW_CANCELLED', 'Interview', id);
  }

  async listInterviews(tenantId: string, query: z.infer<typeof listInterviewsQuerySchema>) {
    const { rows, total } = await this.interviewRepository.findMany(
      tenantId,
      {
        candidateId: query.candidateId,
        interviewerId: query.interviewerId,
        outcome: query.outcome,
        from: query.from,
        to: query.to,
      },
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  private audit(
    tenantId: string,
    meta: RequestMeta,
    action: Parameters<typeof auditLogService.record>[0]['action'],
    targetType: string,
    targetId: string,
  ) {
    return auditLogService.record({
      tenantId,
      actorUserId: meta.actorUserId,
      action,
      targetType,
      targetId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

export const recruitmentService = new RecruitmentService();
