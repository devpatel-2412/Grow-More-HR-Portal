import { describe, it, expect, vi } from 'vitest';
import { RecruitmentService, canTransition, overlaps } from './recruitment.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../../db/prisma.js', () => ({ prisma: { candidate: { count: vi.fn().mockResolvedValue(0) } } }));
vi.mock('../../shared/email/email.service.js', () => ({ emailService: { send: vi.fn().mockResolvedValue(undefined) } }));

function makeCandidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cand-1',
    tenantId: 'tenant-1',
    jobPostingId: 'job-1',
    firstName: 'Casey',
    lastName: 'Candidate',
    email: 'casey@example.com',
    status: 'APPLIED',
    ...overrides,
  };
}

function makeDeps() {
  const postingRepository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue({ id: 'job-1', tenantId: 'tenant-1', status: 'ACTIVE', openings: 1, salaryMin: null, salaryMax: null }),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    countByStage: vi.fn(),
  };
  const candidateRepository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(makeCandidate()),
    findByPostingAndEmail: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeCandidate(), id, ...data })),
    delete: vi.fn(),
    findMany: vi.fn(),
  };
  const interviewRepository = {
    create: vi.fn().mockResolvedValue({ id: 'int-1', scheduledAt: new Date('2026-08-10T10:00:00Z'), mode: 'VIDEO', location: null }),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByCandidate: vi.fn().mockResolvedValue([]),
    findNearby: vi.fn().mockResolvedValue([]),
    findMany: vi.fn(),
  };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    findByUserId: vi.fn(),
  };
  const tenantRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'tenant-1', name: 'Acme Inc' }),
  };
  return { postingRepository, candidateRepository, interviewRepository, employeeRepository, tenantRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new RecruitmentService(
    deps.postingRepository as never,
    deps.candidateRepository as never,
    deps.interviewRepository as never,
    deps.employeeRepository as never,
    deps.tenantRepository as never,
  );
}

describe('canTransition — hiring pipeline', () => {
  it('walks forward one stage at a time', () => {
    expect(canTransition('APPLIED', 'SCREENING')).toBe(true);
    expect(canTransition('SCREENING', 'INTERVIEW')).toBe(true);
    expect(canTransition('INTERVIEW', 'OFFER')).toBe(true);
    expect(canTransition('OFFER', 'HIRED')).toBe(true);
  });

  it('refuses to skip stages', () => {
    expect(canTransition('APPLIED', 'OFFER')).toBe(false);
    expect(canTransition('APPLIED', 'HIRED')).toBe(false);
    expect(canTransition('SCREENING', 'HIRED')).toBe(false);
  });

  it('allows rejection from any live stage', () => {
    for (const stage of ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'] as const) {
      expect(canTransition(stage, 'REJECTED')).toBe(true);
    }
  });

  it('treats HIRED and REJECTED as terminal', () => {
    expect(canTransition('HIRED', 'OFFER')).toBe(false);
    expect(canTransition('REJECTED', 'APPLIED')).toBe(false);
    expect(canTransition('REJECTED', 'SCREENING')).toBe(false);
  });

  it('does not allow moving backwards', () => {
    expect(canTransition('OFFER', 'INTERVIEW')).toBe(false);
    expect(canTransition('INTERVIEW', 'SCREENING')).toBe(false);
  });
});

describe('overlaps', () => {
  it('detects a partial overlap', () => {
    expect(overlaps(new Date('2026-08-01T10:00:00Z'), 60, new Date('2026-08-01T10:30:00Z'), 60)).toBe(true);
  });

  it('treats back-to-back slots as free', () => {
    expect(overlaps(new Date('2026-08-01T10:00:00Z'), 60, new Date('2026-08-01T11:00:00Z'), 60)).toBe(false);
  });

  it('detects full containment', () => {
    expect(overlaps(new Date('2026-08-01T10:00:00Z'), 180, new Date('2026-08-01T11:00:00Z'), 30)).toBe(true);
  });
});

describe('RecruitmentService.changeStage', () => {
  it('rejects an illegal stage jump', async () => {
    const deps = makeDeps();
    await expect(build(deps).changeStage('tenant-1', 'cand-1', 'HIRED', undefined, {})).rejects.toThrow(ConflictError);
  });

  it('rejects a no-op transition to the current stage', async () => {
    const deps = makeDeps();
    await expect(build(deps).changeStage('tenant-1', 'cand-1', 'APPLIED', undefined, {})).rejects.toThrow(ConflictError);
  });

  it('stores a rejection reason when rejecting', async () => {
    const deps = makeDeps();
    await build(deps).changeStage('tenant-1', 'cand-1', 'REJECTED', 'Not enough experience', {});
    expect(deps.candidateRepository.update).toHaveBeenCalledWith('cand-1', {
      status: 'REJECTED',
      rejectionReason: 'Not enough experience',
    });
  });

  it('clears any stale rejection reason on a forward move', async () => {
    const deps = makeDeps();
    await build(deps).changeStage('tenant-1', 'cand-1', 'SCREENING', undefined, {});
    expect(deps.candidateRepository.update).toHaveBeenCalledWith('cand-1', {
      status: 'SCREENING',
      rejectionReason: null,
    });
  });

  it('404s across tenants instead of leaking existence', async () => {
    const deps = makeDeps();
    deps.candidateRepository.findById.mockResolvedValue(makeCandidate({ tenantId: 'other-tenant' }));
    await expect(build(deps).changeStage('tenant-1', 'cand-1', 'SCREENING', undefined, {})).rejects.toThrow(NotFoundError);
  });
});

describe('RecruitmentService.createCandidate', () => {
  it('refuses a duplicate application to the same posting', async () => {
    const deps = makeDeps();
    deps.candidateRepository.findByPostingAndEmail.mockResolvedValue(makeCandidate());
    await expect(
      build(deps).createCandidate(
        'tenant-1',
        { jobPostingId: 'job-1', firstName: 'Casey', lastName: 'C', email: 'casey@example.com' },
        {},
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('refuses applications to a closed posting', async () => {
    const deps = makeDeps();
    deps.postingRepository.findById.mockResolvedValue({ id: 'job-1', tenantId: 'tenant-1', status: 'CLOSED', openings: 1 });
    await expect(
      build(deps).createCandidate(
        'tenant-1',
        { jobPostingId: 'job-1', firstName: 'Casey', lastName: 'C', email: 'casey@example.com' },
        {},
      ),
    ).rejects.toThrow(ConflictError);
  });
});

describe('RecruitmentService.scheduleInterview', () => {
  const slot = { candidateId: 'cand-1', scheduledAt: new Date('2026-08-01T10:00:00Z'), durationMinutes: 60, mode: 'VIDEO' as const, round: 1 };

  it('refuses to book an interview for a closed candidate', async () => {
    const deps = makeDeps();
    deps.candidateRepository.findById.mockResolvedValue(makeCandidate({ status: 'REJECTED' }));
    await expect(build(deps).scheduleInterview('tenant-1', slot, {})).rejects.toThrow(ConflictError);
  });

  it('refuses to double-book an interviewer', async () => {
    const deps = makeDeps();
    deps.interviewRepository.findNearby.mockResolvedValue([
      { id: 'int-existing', scheduledAt: new Date('2026-08-01T10:30:00Z'), durationMinutes: 60 },
    ]);
    await expect(build(deps).scheduleInterview('tenant-1', { ...slot, interviewerId: 'emp-1' }, {})).rejects.toThrow(
      ConflictError,
    );
  });

  it('allows a back-to-back slot for the same interviewer', async () => {
    const deps = makeDeps();
    deps.interviewRepository.findNearby.mockResolvedValue([
      { id: 'int-existing', scheduledAt: new Date('2026-08-01T09:00:00Z'), durationMinutes: 60 },
    ]);
    await expect(build(deps).scheduleInterview('tenant-1', { ...slot, interviewerId: 'emp-1' }, {})).resolves.toBeTruthy();
  });

  it('404s an interviewer from another tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'emp-1', tenantId: 'other-tenant' });
    await expect(build(deps).scheduleInterview('tenant-1', { ...slot, interviewerId: 'emp-1' }, {})).rejects.toThrow(
      NotFoundError,
    );
  });
});
