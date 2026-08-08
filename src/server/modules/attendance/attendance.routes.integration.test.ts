/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 * See auth.routes.integration.test.ts's header comment for setup commands — same requirements.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { signupTestTenant } from '../../shared/testing/signup-test-tenant.js';

const app = createApp();

async function resetDatabase() {
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

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('Attendance — punch in/out and break flow', () => {
  it('completes a full day: punch in, break, punch out — with correct computed fields', async () => {
    const { res: signupRes } = await signupTenant();
    const token = signupRes.body.data.accessToken;
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

    const punchInRes = await auth(request(app).post('/api/v1/attendance/punch-in')).send({ deviceType: 'web' });
    expect(punchInRes.status).toBe(201);
    const checkIn = new Date(punchInRes.body.data.checkIn);
    const expectedLogout = new Date(checkIn.getTime() + 9 * 60 * 60000); // default policy: 9h window
    expect(new Date(punchInRes.body.data.requiredLogoutTime).getTime()).toBe(expectedLogout.getTime());

    const todayRes = await auth(request(app).get('/api/v1/attendance/today'));
    expect(todayRes.status).toBe(200);
    expect(todayRes.body.data.onBreak).toBe(false);

    const breakStartRes = await auth(request(app).post('/api/v1/attendance/break/start'));
    expect(breakStartRes.status).toBe(200);
    expect(breakStartRes.body.data.breaks).toHaveLength(1);
    expect(breakStartRes.body.data.breaks[0].breakOut).toBeNull();

    const breakEndRes = await auth(request(app).post('/api/v1/attendance/break/end'));
    expect(breakEndRes.status).toBe(200);
    expect(breakEndRes.body.data.breaks[0].breakOut).not.toBeNull();

    const punchOutRes = await auth(request(app).post('/api/v1/attendance/punch-out'));
    expect(punchOutRes.status).toBe(200);
    expect(punchOutRes.body.data.checkOut).not.toBeNull();

    const historyRes = await auth(request(app).get('/api/v1/attendance'));
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data).toHaveLength(1);
    expect(historyRes.body.data[0].checkOut).not.toBeNull();
  });

  it('rejects a second punch-in on the same day', async () => {
    const { res: signupRes } = await signupTenant();
    const token = signupRes.body.data.accessToken;
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

    await auth(request(app).post('/api/v1/attendance/punch-in'));
    const second = await auth(request(app).post('/api/v1/attendance/punch-in'));
    expect(second.status).toBe(409);
  });

  it('rejects punching out with an open break', async () => {
    const { res: signupRes } = await signupTenant();
    const token = signupRes.body.data.accessToken;
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);

    await auth(request(app).post('/api/v1/attendance/punch-in'));
    await auth(request(app).post('/api/v1/attendance/break/start'));
    const punchOutRes = await auth(request(app).post('/api/v1/attendance/punch-out'));
    expect(punchOutRes.status).toBe(409);
  });

  it('rejects starting a break before punching in', async () => {
    const { res: signupRes } = await signupTenant();
    const token = signupRes.body.data.accessToken;
    const res = await request(app).post('/api/v1/attendance/break/start').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('Attendance — tenant isolation', () => {
  it("an admin from tenant A querying a tenant B employee id gets zero rows, not tenant B's data", async () => {
    const { res: tenantARes } = await signupTenant();
    const { res: tenantBRes } = await signupTenant();

    const tenantBMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tenantBRes.body.data.accessToken}`);
    const tenantBEmployeeId = tenantBMe.body.data.profile.id;
    await request(app).post('/api/v1/attendance/punch-in').set('Authorization', `Bearer ${tenantBRes.body.data.accessToken}`);

    // ADMIN has ATTENDANCE_READ_TENANT, so the query is allowed to execute — but the repository
    // filters by the caller's OWN tenantId, so a foreign employeeId simply matches nothing.
    const res = await request(app)
      .get(`/api/v1/attendance?employeeId=${tenantBEmployeeId}`)
      .set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("a plain EMPLOYEE cannot pass a foreign employeeId to view a co-worker's attendance", async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const adminMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = adminMe.body.data.tenant.id;
    const adminEmployeeId = adminMe.body.data.profile.id;

    // Create a genuine EMPLOYEE-role account directly (bypassing the email-delivered invite
    // token, which this test process has no way to intercept) so we can log in as a real
    // non-privileged user and exercise the permission boundary over real HTTP.
    const employeeEmail = `employee-${domain}@acme.com`;
    const employeePassword = 'CorrectPassword123';
    const { hashPassword } = await import('../../shared/utils/hash.util.js');
    const employeeUser = await prisma.user.create({
      data: { email: employeeEmail, passwordHash: hashPassword(employeePassword), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
    });
    await prisma.employeeProfile.create({
      data: {
        userId: employeeUser.id,
        tenantId,
        employeeId: `EMP-TEST-${employeeUser.id.slice(0, 6)}`,
        firstName: 'Ellie',
        lastName: 'Employee',
        department: 'Engineering',
        designation: 'Engineer',
        dateOfJoining: new Date(),
        status: 'ACTIVE',
      },
    });

    const employeeLogin = await request(app).post('/api/v1/auth/login').send({ email: employeeEmail, password: employeePassword });
    expect(employeeLogin.status).toBe(200);
    const employeeToken = employeeLogin.body.data.accessToken;

    const res = await request(app)
      .get(`/api/v1/attendance?employeeId=${adminEmployeeId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Attendance regularization', () => {
  it('a pending request approved by an admin creates/updates the underlying Attendance row', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const requestRes = await request(app)
      .post('/api/v1/attendance/regularization')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: '2026-01-05',
        requestedCheckIn: '2026-01-05T09:30:00.000Z',
        requestedCheckOut: '2026-01-05T18:30:00.000Z',
        reason: 'Forgot to punch in',
      });
    expect(requestRes.status).toBe(201);
    expect(requestRes.body.data.status).toBe('PENDING');

    const approveRes = await request(app)
      .patch(`/api/v1/attendance/regularization/${requestRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    const historyRes = await request(app).get('/api/v1/attendance').set('Authorization', `Bearer ${adminToken}`);
    const jan5 = historyRes.body.data.find((a: { date: string }) => a.date.startsWith('2026-01-05'));
    expect(jan5).toBeTruthy();
    expect(jan5.checkOut).not.toBeNull();
  });

  it('rejects reviewing the same request twice', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const requestRes = await request(app)
      .post('/api/v1/attendance/regularization')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ date: '2026-01-06', requestedCheckIn: '2026-01-06T09:30:00.000Z', reason: 'Missed punch' });

    await request(app)
      .patch(`/api/v1/attendance/regularization/${requestRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });

    const secondReview = await request(app)
      .patch(`/api/v1/attendance/regularization/${requestRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(secondReview.status).toBe(409);
  });
});
