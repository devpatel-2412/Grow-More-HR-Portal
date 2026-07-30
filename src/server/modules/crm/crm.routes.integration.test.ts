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
  it('walks a lead through the funnel and converts it into a client', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const leadRes = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Globex', contactName: 'Hank Scorpio', email: 'hank@globex.com', estimatedValue: 20000 });
    expect(leadRes.status).toBe(201);
    expect(leadRes.body.data.status).toBe('NEW');
    const leadId = leadRes.body.data.id;

    // Cannot mark WON directly.
    const wonRes = await request(app)
      .patch(`/api/v1/leads/${leadId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WON' });
    expect(wonRes.status).toBe(409);

    for (const stage of ['CONTACTED', 'QUALIFIED', 'PROPOSAL']) {
      const stageRes = await request(app)
        .patch(`/api/v1/leads/${leadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: stage });
      expect(stageRes.status).toBe(200);
    }

    const convertRes = await request(app)
      .post(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ industry: 'Manufacturing' });
    expect(convertRes.status).toBe(201);
    expect(convertRes.body.data.companyName).toBe('Globex');
    expect(convertRes.body.data.contactEmail).toBe('hank@globex.com');
    const clientId = convertRes.body.data.id;

    // Converting twice is rejected.
    const reconvertRes = await request(app)
      .post(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(reconvertRes.status).toBe(409);

    const clientRes = await request(app).get(`/api/v1/clients/${clientId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(clientRes.status).toBe(200);
    expect(clientRes.body.data.status).toBe('ACTIVE');
  });

  it('refuses to skip stages and rejects converting too early', async () => {
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

    const earlyConvertRes = await request(app)
      .post(`/api/v1/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(earlyConvertRes.status).toBe(409);
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

describe('CRM — clients and contacts', () => {
  it('scopes duplicate contact-email checks per tenant, not globally', async () => {
    const { res: signupA } = await signupTenant();
    const tokenA = signupA.body.data.accessToken;
    const { res: signupB } = await signupTenant();
    const tokenB = signupB.body.data.accessToken;

    // The same contact email at two different tenants must both succeed.
    const clientA = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ companyName: 'Shared Co', contactEmail: 'shared@example.com' });
    expect(clientA.status).toBe(201);

    const clientB = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ companyName: 'Shared Co', contactEmail: 'shared@example.com' });
    expect(clientB.status).toBe(201);

    // But a duplicate within the same tenant is rejected.
    const duplicateRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ companyName: 'Shared Co Again', contactEmail: 'shared@example.com' });
    expect(duplicateRes.status).toBe(409);
  });

  it('adds contacts and keeps only one marked primary', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const clientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Acme Client', contactEmail: 'client@example.com' });
    const clientId = clientRes.body.data.id;

    await request(app)
      .post(`/api/v1/clients/${clientId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alice', email: 'alice@example.com', isPrimary: true });
    await request(app)
      .post(`/api/v1/clients/${clientId}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bob', email: 'bob@example.com', isPrimary: true });

    const detailRes = await request(app).get(`/api/v1/clients/${clientId}`).set('Authorization', `Bearer ${adminToken}`);
    const primaries = detailRes.body.data.contacts.filter((c: { isPrimary: boolean }) => c.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].name).toBe('Bob');
  });

  it('logs an activity against a client and lists it back', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const clientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Acme Client', contactEmail: 'client2@example.com' });
    const clientId = clientRes.body.data.id;

    const activityRes = await request(app)
      .post('/api/v1/crm-activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'CALL', subject: 'Renewal check-in', occurredAt: '2026-07-29T10:00:00.000Z', clientId });
    expect(activityRes.status).toBe(201);

    // Must be attached to exactly one of lead/client.
    const bothRes = await request(app)
      .post('/api/v1/crm-activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'NOTE', subject: 'Bad', occurredAt: '2026-07-29T10:00:00.000Z', clientId, leadId: clientId });
    expect(bothRes.status).toBe(400);

    const listRes = await request(app)
      .get(`/api/v1/crm-activities?clientId=${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.data).toHaveLength(1);
  });
});
