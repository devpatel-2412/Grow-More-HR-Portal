/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 * See auth.routes.integration.test.ts's header comment for setup commands — same requirements.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../shared/utils/hash.util.js';

const app = createApp();

async function resetDatabase() {
  await prisma.announcement.deleteMany();
  await prisma.generatedDocument.deleteMany();
  await prisma.canvaTemplate.deleteMany();
  await prisma.roomBooking.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.secureDocument.deleteMany();
  await prisma.knowledgeBaseArticle.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.financePayment.deleteMany();
  await prisma.financeLineItem.deleteMany();
  await prisma.financeDocument.deleteMany();
  await prisma.crmActivity.deleteMany();
  await prisma.clientContact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.clientPortal.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.dailyWorkReport.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendanceRegularization.deleteMany();
  await prisma.attendanceBreak.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

function uniqueDomain(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function signupTenant() {
  const domain = uniqueDomain('acme');
  const res = await request(app).post('/api/v1/auth/signup').send({
    tenantName: 'Acme Inc',
    tenantDomain: domain,
    email: `admin-${domain}@acme.com`,
    password: 'CorrectPassword123',
    firstName: 'Ada',
    lastName: 'Admin',
  });
  return { res, domain };
}

async function createEmployeeAccount(tenantId: string, domain: string) {
  const email = `worker-${domain}-${Math.random().toString(36).slice(2, 8)}@acme.com`;
  const password = 'CorrectPassword123';
  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
  });
  const profile = await prisma.employeeProfile.create({
    data: {
      userId: user.id,
      tenantId,
      employeeId: `EMP-TEST-${user.id.slice(0, 6)}`,
      firstName: 'Wanda',
      lastName: 'Worker',
      department: 'Engineering',
      designation: 'Engineer',
      dateOfJoining: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string, employeeId: profile.id };
}

async function createPosting(token: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/job-postings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Senior Engineer',
      description: 'Build the thing',
      department: 'Engineering',
      location: 'Remote',
      status: 'ACTIVE',
      ...overrides,
    });
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('Recruitment — job postings and candidates', () => {
  it('walks a candidate through the full hiring pipeline', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const postingRes = await createPosting(adminToken);
    expect(postingRes.status).toBe(201);
    const jobPostingId = postingRes.body.data.id;

    const candidateRes = await request(app)
      .post('/api/v1/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobPostingId, firstName: 'Casey', lastName: 'Candidate', email: 'casey@example.com' });
    expect(candidateRes.status).toBe(201);
    expect(candidateRes.body.data.status).toBe('APPLIED');
    const candidateId = candidateRes.body.data.id;

    // Skipping stages is rejected.
    const skipRes = await request(app)
      .patch(`/api/v1/candidates/${candidateId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIRED' });
    expect(skipRes.status).toBe(409);

    for (const stage of ['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED']) {
      const stageRes = await request(app)
        .patch(`/api/v1/candidates/${candidateId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: stage });
      expect(stageRes.status).toBe(200);
      expect(stageRes.body.data.status).toBe(stage);
    }

    // HIRED is terminal.
    const reopenRes = await request(app)
      .patch(`/api/v1/candidates/${candidateId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });
    expect(reopenRes.status).toBe(409);

    const pipelineRes = await request(app)
      .get(`/api/v1/job-postings/${jobPostingId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pipelineRes.body.data.pipeline).toEqual({ HIRED: 1 });
  });

  it('caps hires at the number of openings', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const postingRes = await createPosting(adminToken, { openings: 1 });
    const jobPostingId = postingRes.body.data.id;

    const ids: string[] = [];
    for (const email of ['one@example.com', 'two@example.com']) {
      const res = await request(app)
        .post('/api/v1/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ jobPostingId, firstName: 'Casey', lastName: 'Candidate', email });
      ids.push(res.body.data.id);
    }

    for (const id of ids) {
      for (const stage of ['SCREENING', 'INTERVIEW', 'OFFER']) {
        await request(app)
          .patch(`/api/v1/candidates/${id}/stage`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: stage });
      }
    }

    const firstHire = await request(app)
      .patch(`/api/v1/candidates/${ids[0]}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIRED' });
    expect(firstHire.status).toBe(200);

    const secondHire = await request(app)
      .patch(`/api/v1/candidates/${ids[1]}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIRED' });
    expect(secondHire.status).toBe(409);
  });

  it('rejects duplicate applications and applications to a closed posting', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const postingRes = await createPosting(adminToken);
    const jobPostingId = postingRes.body.data.id;

    await request(app)
      .post('/api/v1/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobPostingId, firstName: 'Casey', lastName: 'Candidate', email: 'casey@example.com' });

    const duplicateRes = await request(app)
      .post('/api/v1/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobPostingId, firstName: 'Casey', lastName: 'Again', email: 'casey@example.com' });
    expect(duplicateRes.status).toBe(409);

    await request(app)
      .patch(`/api/v1/job-postings/${jobPostingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED' });

    const closedRes = await request(app)
      .post('/api/v1/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobPostingId, firstName: 'Late', lastName: 'Applicant', email: 'late@example.com' });
    expect(closedRes.status).toBe(409);
  });

  it('blocks a plain employee from managing postings but isolates tenants on read', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await createPosting(worker.token);
    expect(forbiddenRes.status).toBe(403);

    const postingRes = await createPosting(adminToken);

    const { res: signupB } = await signupTenant();
    const crossTenantRes = await request(app)
      .get(`/api/v1/job-postings/${postingRes.body.data.id}`)
      .set('Authorization', `Bearer ${signupB.body.data.accessToken}`);
    expect(crossTenantRes.status).toBe(404);
  });
});

describe('Recruitment — interviews', () => {
  it('schedules interviews and refuses to double-book an interviewer', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const interviewer = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const postingRes = await createPosting(adminToken);
    const jobPostingId = postingRes.body.data.id;

    const candidateIds: string[] = [];
    for (const email of ['a@example.com', 'b@example.com']) {
      const res = await request(app)
        .post('/api/v1/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ jobPostingId, firstName: 'Casey', lastName: 'Candidate', email });
      candidateIds.push(res.body.data.id);
    }

    const firstRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidateIds[0],
        interviewerId: interviewer.employeeId,
        scheduledAt: '2026-08-01T10:00:00.000Z',
        durationMinutes: 60,
      });
    expect(firstRes.status).toBe(201);

    // Overlapping slot for the same interviewer.
    const clashRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidateIds[1],
        interviewerId: interviewer.employeeId,
        scheduledAt: '2026-08-01T10:30:00.000Z',
        durationMinutes: 60,
      });
    expect(clashRes.status).toBe(409);

    // Back-to-back is fine.
    const adjacentRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        candidateId: candidateIds[1],
        interviewerId: interviewer.employeeId,
        scheduledAt: '2026-08-01T11:00:00.000Z',
        durationMinutes: 60,
      });
    expect(adjacentRes.status).toBe(201);

    // Recording an outcome closes the slot out.
    const feedbackRes = await request(app)
      .patch(`/api/v1/interviews/${firstRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ outcome: 'PASSED', rating: 4, feedback: 'Strong systems knowledge' });
    expect(feedbackRes.status).toBe(200);
    expect(feedbackRes.body.data.outcome).toBe('PASSED');
    expect(feedbackRes.body.data.rating).toBe(4);

    const candidateDetail = await request(app)
      .get(`/api/v1/candidates/${candidateIds[0]}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(candidateDetail.body.data.interviews).toHaveLength(1);
  });

  it('refuses to schedule an interview for a rejected candidate', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const postingRes = await createPosting(adminToken);

    const candidateRes = await request(app)
      .post('/api/v1/candidates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ jobPostingId: postingRes.body.data.id, firstName: 'Casey', lastName: 'C', email: 'casey@example.com' });
    const candidateId = candidateRes.body.data.id;

    await request(app)
      .patch(`/api/v1/candidates/${candidateId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', rejectionReason: 'Not a fit' });

    const interviewRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ candidateId, scheduledAt: '2026-08-01T10:00:00.000Z' });
    expect(interviewRes.status).toBe(409);
  });
});
