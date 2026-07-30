import { prisma } from '../../db/prisma.js';
import type { Prisma, JobPostingStatus, CandidateStatus, InterviewOutcome } from '@prisma/client';

export class JobPostingRepository {
  create(data: Prisma.JobPostingCreateInput) {
    return prisma.jobPosting.create({ data });
  }

  findById(id: string) {
    return prisma.jobPosting.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.JobPostingUpdateInput) {
    return prisma.jobPosting.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.jobPosting.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { status?: JobPostingStatus; department?: string; search?: string },
    skip: number,
    take: number,
  ) {
    const where: Prisma.JobPostingWhereInput = {
      tenantId,
      status: filter.status,
      department: filter.department,
      OR: filter.search
        ? [
            { title: { contains: filter.search, mode: 'insensitive' } },
            { location: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.jobPosting.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.jobPosting.count({ where }),
    ]);
    return { rows, total };
  }

  /** Candidate counts per stage for one posting — powers the pipeline summary without loading every row. */
  async countByStage(jobPostingId: string) {
    const grouped = await prisma.candidate.groupBy({
      by: ['status'],
      where: { jobPostingId },
      _count: true,
    });
    return grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count;
      return acc;
    }, {});
  }
}

export class CandidateRepository {
  create(data: Prisma.CandidateCreateInput) {
    return prisma.candidate.create({ data });
  }

  findById(id: string) {
    return prisma.candidate.findUnique({ where: { id } });
  }

  findByPostingAndEmail(jobPostingId: string, email: string) {
    return prisma.candidate.findUnique({ where: { jobPostingId_email: { jobPostingId, email } } });
  }

  update(id: string, data: Prisma.CandidateUpdateInput) {
    return prisma.candidate.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.candidate.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { jobPostingId?: string; status?: CandidateStatus; search?: string },
    skip: number,
    take: number,
  ) {
    const where: Prisma.CandidateWhereInput = {
      tenantId,
      jobPostingId: filter.jobPostingId,
      status: filter.status,
      OR: filter.search
        ? [
            { firstName: { contains: filter.search, mode: 'insensitive' } },
            { lastName: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.candidate.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.candidate.count({ where }),
    ]);
    return { rows, total };
  }
}

export class InterviewRepository {
  create(data: Prisma.InterviewCreateInput) {
    return prisma.interview.create({ data });
  }

  findById(id: string) {
    return prisma.interview.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.InterviewUpdateInput) {
    return prisma.interview.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.interview.delete({ where: { id } });
  }

  findByCandidate(candidateId: string) {
    return prisma.interview.findMany({ where: { candidateId }, orderBy: { scheduledAt: 'asc' } });
  }

  /**
   * Pending interviews for this interviewer that start anywhere near the proposed slot. There is
   * no stored end time, so the caller derives each end from its duration and checks the overlap;
   * the window is widened by the longest allowed interview (8h) so nothing straddling it is missed.
   */
  findNearby(interviewerId: string, start: Date, end: Date, excludeId?: string) {
    const MAX_INTERVIEW_MS = 8 * 60 * 60 * 1000;
    return prisma.interview.findMany({
      where: {
        interviewerId,
        id: excludeId ? { not: excludeId } : undefined,
        outcome: 'PENDING',
        scheduledAt: { gte: new Date(start.getTime() - MAX_INTERVIEW_MS), lt: end },
      },
    });
  }

  async findMany(
    tenantId: string,
    filter: { candidateId?: string; interviewerId?: string; outcome?: InterviewOutcome; from?: Date; to?: Date },
    skip: number,
    take: number,
  ) {
    const where: Prisma.InterviewWhereInput = {
      tenantId,
      candidateId: filter.candidateId,
      interviewerId: filter.interviewerId,
      outcome: filter.outcome,
      scheduledAt: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.interview.findMany({ where, orderBy: { scheduledAt: 'asc' }, skip, take }),
      prisma.interview.count({ where }),
    ]);
    return { rows, total };
  }
}
