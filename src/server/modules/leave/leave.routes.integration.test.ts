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

async function signupTenant(overrides: Partial<Record<string, string>> = {}) {
  return signupTestTenant(app, overrides);
}

/** Creates a real EMPLOYEE-role account with a profile reporting to the given manager, bypassing the email-delivered invite flow. */
async function createDirectReport(tenantId: string, managerEmployeeId: string, domain: string) {
  const email = `report-${domain}-${Date.now()}@acme.com`;
  const password = 'CorrectPassword123';
  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
  });
  await prisma.employeeProfile.create({
    data: {
      userId: user.id,
      tenantId,
      employeeId: `EMP-TEST-${user.id.slice(0, 6)}`,
      firstName: 'Rep',
      lastName: 'Ortee',
      department: 'Engineering',
      designation: 'Engineer',
      dateOfJoining: new Date(),
      status: 'ACTIVE',
      managerId: managerEmployeeId,
    },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string, userId: user.id };
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

describe('Leave — full Employee → Manager → HR approval flow', () => {
  it('goes PENDING_MANAGER -> PENDING_HR -> APPROVED across both stages', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const adminMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = adminMe.body.data.tenant.id;
    const managerEmployeeId = adminMe.body.data.profile.id;

    const { token: reportToken } = await createDirectReport(tenantId, managerEmployeeId, domain);

    const submitRes = await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${reportToken}`)
      .send({ leaveType: 'CASUAL', startDate: '2026-02-10', endDate: '2026-02-11', isHalfDay: false, reason: 'Trip' });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('PENDING_MANAGER');
    expect(submitRes.body.data.totalDays).toBe(2);
    const leaveId = submitRes.body.data.id;

    // The admin here IS the manager (managerEmployeeId), so this exercises the real ownership check.
    const managerApprove = await request(app)
      .patch(`/api/v1/leave/${leaveId}/manager-review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(managerApprove.status).toBe(200);
    expect(managerApprove.body.data.status).toBe('PENDING_HR');

    const hrApprove = await request(app)
      .patch(`/api/v1/leave/${leaveId}/hr-review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(hrApprove.status).toBe(200);
    expect(hrApprove.body.data.status).toBe('APPROVED');
  });

  it('a manager rejection is terminal and never reaches HR', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const adminMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = adminMe.body.data.tenant.id;
    const managerEmployeeId = adminMe.body.data.profile.id;
    const { token: reportToken } = await createDirectReport(tenantId, managerEmployeeId, domain);

    const submitRes = await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${reportToken}`)
      .send({ leaveType: 'SICK', startDate: '2026-03-01', endDate: '2026-03-01', isHalfDay: false, reason: 'Flu' });

    const rejectRes = await request(app)
      .patch(`/api/v1/leave/${submitRes.body.data.id}/manager-review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });
    expect(rejectRes.body.data.status).toBe('REJECTED');

    const hrAttempt = await request(app)
      .patch(`/api/v1/leave/${submitRes.body.data.id}/hr-review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(hrAttempt.status).toBe(409);
  });

  it('an employee with no manager skips straight to PENDING_HR', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken; // the first signup admin has no manager

    const submitRes = await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leaveType: 'EARNED', startDate: '2026-04-01', endDate: '2026-04-01', isHalfDay: false, reason: 'Personal' });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('PENDING_HR');
  });

  it('rejects an overlapping request for the same employee', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leaveType: 'CASUAL', startDate: '2026-05-01', endDate: '2026-05-05', isHalfDay: false, reason: 'First' });

    const overlapRes = await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leaveType: 'SICK', startDate: '2026-05-03', endDate: '2026-05-04', isHalfDay: false, reason: 'Second' });

    expect(overlapRes.status).toBe(409);
  });

  it('an employee can cancel their own pending request', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const submitRes = await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leaveType: 'PAID', startDate: '2026-06-01', endDate: '2026-06-01', isHalfDay: false, reason: 'Plans changed' });

    const cancelRes = await request(app)
      .post(`/api/v1/leave/${submitRes.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });
});

describe('Leave — tenant isolation', () => {
  it("an admin from tenant A cannot fetch tenant B's leave request by id", async () => {
    const { res: tenantARes } = await signupTenant();
    const { res: tenantBRes } = await signupTenant();

    const submitRes = await request(app)
      .post('/api/v1/leave')
      .set('Authorization', `Bearer ${tenantBRes.body.data.accessToken}`)
      .send({ leaveType: 'CASUAL', startDate: '2026-07-01', endDate: '2026-07-01', isHalfDay: false, reason: 'x' });

    const res = await request(app)
      .get(`/api/v1/leave/${submitRes.body.data.id}`)
      .set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);

    expect(res.status).toBe(404);
  });
});
