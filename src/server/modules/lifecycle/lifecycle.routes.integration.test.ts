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
  await prisma.fnfSettlement.deleteMany();
  await prisma.lifecycleEvent.deleteMany();
  await prisma.onboardingChecklistItem.deleteMany();
  await prisma.team.deleteMany();
  await prisma.branch.deleteMany();
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

async function createEmployeeAccount(tenantId: string, domain: string, status: 'ONBOARDING' | 'ACTIVE' = 'ONBOARDING') {
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
      department: 'Ops',
      designation: 'Staff',
      dateOfJoining: new Date('2020-01-01'),
      status,
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

describe('Onboarding checklist', () => {
  it('lets the owner view their own checklist, blocks a bystander, and lets EMPLOYEE_UPDATE holders manage it', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain);
    const bystander = await createEmployeeAccount(tenantId, domain);

    const forbiddenCreateRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/checklist`)
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ label: 'Collect ID proof' });
    expect(forbiddenCreateRes.status).toBe(403);

    const createRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/checklist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Collect ID proof' });
    expect(createRes.status).toBe(201);
    const itemId = createRes.body.data.id;

    const bystanderReadRes = await request(app)
      .get(`/api/v1/employees/${worker.employeeId}/checklist`)
      .set('Authorization', `Bearer ${bystander.token}`);
    expect(bystanderReadRes.status).toBe(403);

    const ownReadRes = await request(app)
      .get(`/api/v1/employees/${worker.employeeId}/checklist`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(ownReadRes.status).toBe(200);
    expect(ownReadRes.body.data).toHaveLength(1);

    const completeRes = await request(app)
      .patch(`/api/v1/checklist-items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isCompleted: true });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.isCompleted).toBe(true);
    expect(completeRes.body.data.completedAt).not.toBeNull();

    const deleteRes = await request(app)
      .delete(`/api/v1/checklist-items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);
  });
});

describe('Employee lifecycle', () => {
  it('walks an employee through confirm → promote → transfer → exit initiate → exit complete → F&F settlement', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain, 'ONBOARDING');

    const branchRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Headquarters', code: 'HQ' });
    const branchId = branchRes.body.data.id;

    // Cannot promote while still onboarding-but-unconfirmed is allowed (only exited employees are blocked); confirm first anyway.
    const confirmRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ effectiveDate: '2026-01-01T00:00:00.000Z', notes: 'Completed probation' });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('ACTIVE');

    const doubleConfirmRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ effectiveDate: '2026-01-01T00:00:00.000Z' });
    expect(doubleConfirmRes.status).toBe(409);

    const promoteRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ effectiveDate: '2026-02-01T00:00:00.000Z', newDesignation: 'Senior Staff' });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.designation).toBe('Senior Staff');

    const transferRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/transfer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ effectiveDate: '2026-03-01T00:00:00.000Z', branchId });
    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data.branchId).toBe(branchId);

    const eventsRes = await request(app)
      .get(`/api/v1/employees/${worker.employeeId}/lifecycle-events`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body.data.map((e: { type: string }) => e.type)).toEqual(['TRANSFER', 'PROMOTION', 'CONFIRMATION']);

    // F&F settlement cannot be created for an active employee.
    const tooEarlyFnfRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/fnf-settlement`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lastWorkingDay: '2026-04-01T00:00:00.000Z', pendingSalary: 1000 });
    expect(tooEarlyFnfRes.status).toBe(409);

    const exitInitiateRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/exit/initiate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ effectiveDate: '2026-04-01T00:00:00.000Z', reason: 'Resigned' });
    expect(exitInitiateRes.status).toBe(200);
    expect(exitInitiateRes.body.data.status).toBe('OFFBOARDING');

    const createFnfRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/fnf-settlement`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lastWorkingDay: '2026-04-01T00:00:00.000Z', pendingSalary: 1000, leaveEncashment: 200, bonus: 0, deductions: 50 });
    expect(createFnfRes.status).toBe(201);
    expect(createFnfRes.body.data.netPayable).toBe(1150);

    const approveRes = await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}/fnf-settlement/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(approveRes.status).toBe(200);

    // Editing figures after approval is blocked.
    const blockedEditRes = await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}/fnf-settlement`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lastWorkingDay: '2026-04-01T00:00:00.000Z', pendingSalary: 9999 });
    expect(blockedEditRes.status).toBe(409);

    const exitCompleteRes = await request(app)
      .post(`/api/v1/employees/${worker.employeeId}/exit/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ effectiveDate: '2026-04-01T00:00:00.000Z', outcome: 'RESIGNED' });
    expect(exitCompleteRes.status).toBe(200);
    expect(exitCompleteRes.body.data.status).toBe('RESIGNED');

    const paidRes = await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}/fnf-settlement/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' });
    expect(paidRes.status).toBe(200);
    expect(paidRes.body.data.status).toBe('PAID');
  });
});
