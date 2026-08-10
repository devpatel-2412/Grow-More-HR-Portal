/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 * See auth.routes.integration.test.ts's header comment for setup commands — same requirements.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../shared/utils/hash.util.js';
import { signupTestTenant } from '../../shared/testing/signup-test-tenant.js';

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
  await prisma.lead.deleteMany();
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

async function signupTenant() {
  return signupTestTenant(app);
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
      department: 'Sales',
      designation: 'Rep',
      dateOfJoining: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string, employeeId: profile.id };
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

describe('CRM — leads', () => {
  it('walks a lead through the funnel and wins it directly from the proposal stage', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Globex', contactName: 'Hank Scorpio', email: 'hank@globex.com', estimatedValue: 20000 });
    expect(leadRes.status).toBe(201);
    expect(leadRes.body.data.status).toBe('NEW');
    const leadId = leadRes.body.data.id;

    // Cannot win before reaching the proposal stage.
    const tooEarlyRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WON' });
    expect(tooEarlyRes.status).toBe(409);

    for (const stage of ['CONTACTED', 'QUALIFIED', 'PROPOSAL']) {
      const stageRes = await request(app)
        .patch(`/api/v1/leads/${leadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: stage });
      expect(stageRes.status).toBe(200);
    }

    const wonRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WON' });
    expect(wonRes.status).toBe(200);
    expect(wonRes.body.data.status).toBe('WON');

    // WON is terminal — cannot move again.
    const reWinRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LOST' });
    expect(reWinRes.status).toBe(409);
  });

  it('refuses to skip stages', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Initech', contactName: 'Bill', email: 'bill@initech.com', estimatedValue: 1000 });
    const leadId = leadRes.body.data.id;

    const skipRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROPOSAL' });
    expect(skipRes.status).toBe(409);
  });

  it('marks a lead lost with a reason and keeps it terminal', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Initech', contactName: 'Bill', email: 'bill2@initech.com', estimatedValue: 1000 });
    const leadId = leadRes.body.data.id;

    const lostRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LOST', lostReason: 'Went with a competitor' });
    expect(lostRes.status).toBe(200);
    expect(lostRes.body.data.lostReason).toBe('Went with a competitor');

    const reviveRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONTACTED' });
    expect(reviveRes.status).toBe(409);
  });

  it('blocks a plain employee from managing leads and isolates tenants', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ companyName: 'Blocked', contactName: 'X', email: 'x@blocked.com', estimatedValue: 0 });
    expect(forbiddenRes.status).toBe(403);

    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Cross', contactName: 'X', email: 'x@cross.com', estimatedValue: 0 });

    const { res: signupB } = await signupTenant();
    const crossTenantRes = await request(app)
      .get(`/api/v1/leads/${leadRes.body.data.id}`)
      .set('Authorization', `Bearer ${signupB.body.data.accessToken}`);
    expect(crossTenantRes.status).toBe(404);
  });
});

describe('CRM — activities', () => {
  it('logs an activity against a lead and lists it back', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Acme Lead', contactName: 'Cara', email: 'cara@acme-lead.com', estimatedValue: 500 });
    const leadId = leadRes.body.data.id;

    const activityRes = await request(app)
      .post('/api/v1/crm-activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'CALL', subject: 'Discovery call', occurredAt: '2026-07-29T10:00:00.000Z', leadId });
    expect(activityRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/crm-activities?leadId=${leadId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.data).toHaveLength(1);
  });
});
