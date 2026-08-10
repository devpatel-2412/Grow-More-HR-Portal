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
      department: 'Engineering',
      designation: 'Engineer',
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

describe('Payroll', () => {
  it('runs the full lifecycle: structure → generate → edit → approve → pay', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const { employeeId } = await createEmployeeAccount(tenantId, domain);

    const structureRes = await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId, effectiveFrom: '2026-01-01', basicSalary: 20000, hra: 8000, allowance: 2000 });
    expect(structureRes.status).toBe(201);

    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 7, year: 2026 });
    expect(runRes.status).toBe(201);
    expect(runRes.body.data.status).toBe('DRAFT');
    // The admin's own profile has no salary structure, so only the one worker is paid.
    expect(runRes.body.data.itemCount).toBe(1);

    const runId = runRes.body.data.id;
    const item = runRes.body.data.items[0];
    expect(item.grossSalary).toBe(30000);
    expect(item.pfDeduction).toBe(1800); // capped at the 15000 wage ceiling
    expect(item.esicDeduction).toBe(0); // gross is above the 21000 ceiling
    expect(item.netSalary).toBe(28000);

    // A duplicate run for the same period is rejected.
    const duplicateRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 7, year: 2026 });
    expect(duplicateRes.status).toBe(409);

    // Adding a bonus recomputes the payslip and the run total together.
    const bonusRes = await request(app)
      .patch(`/api/v1/payroll/payslips/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bonus: 5000 });
    expect(bonusRes.status).toBe(200);
    expect(bonusRes.body.data.grossSalary).toBe(35000);
    expect(bonusRes.body.data.netSalary).toBe(33000);

    const afterBonus = await request(app).get(`/api/v1/payroll/runs/${runId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(afterBonus.body.data.totalNet).toBe(33000);

    // Cannot skip straight from draft to paid.
    const skipRes = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(skipRes.status).toBe(409);

    const approveRes = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Approved payslips are financial records and can no longer be edited.
    const lateEditRes = await request(app)
      .patch(`/api/v1/payroll/payslips/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bonus: 9999 });
    expect(lateEditRes.status).toBe(409);

    const paidRes = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(paidRes.status).toBe(200);
    expect(paidRes.body.data.status).toBe('PAID');

    // PAID is terminal.
    const cancelRes = await request(app)
      .post(`/api/v1/payroll/runs/${runId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cancelRes.status).toBe(409);
  });

  it('docks approved unpaid leave that falls inside the payroll month', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const { employeeId } = await createEmployeeAccount(tenantId, domain);

    await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId, effectiveFrom: '2026-01-01', basicSalary: 20000, hra: 8000, allowance: 2000 });

    await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        leaveType: 'UNPAID',
        startDate: new Date('2026-07-10T00:00:00.000Z'),
        endDate: new Date('2026-07-11T00:00:00.000Z'),
        isHalfDay: false,
        totalDays: 2,
        reason: 'Personal',
        status: 'APPROVED',
      },
    });

    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 7, year: 2026 });

    const item = runRes.body.data.items[0];
    expect(item.unpaidLeaveDays).toBe(2);
    expect(item.unpaidLeaveDeduction).toBe(2307.69); // 30000/26 * 2
    expect(item.grossSalary).toBe(27692.31);
  });

  it('ignores unpaid leave from a different month', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const { employeeId } = await createEmployeeAccount(tenantId, domain);

    await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId, effectiveFrom: '2026-01-01', basicSalary: 20000, hra: 8000, allowance: 2000 });

    await prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        leaveType: 'UNPAID',
        startDate: new Date('2026-06-10T00:00:00.000Z'),
        endDate: new Date('2026-06-11T00:00:00.000Z'),
        isHalfDay: false,
        totalDays: 2,
        reason: 'Personal',
        status: 'APPROVED',
      },
    });

    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 7, year: 2026 });

    expect(runRes.body.data.items[0].unpaidLeaveDays).toBe(0);
    expect(runRes.body.data.items[0].grossSalary).toBe(30000);
  });

  it('scopes payslip reads: an employee sees only their own', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain);
    const other = await createEmployeeAccount(tenantId, domain);

    for (const id of [worker.employeeId, other.employeeId]) {
      await request(app)
        .post('/api/v1/payroll/salary-structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employeeId: id, effectiveFrom: '2026-01-01', basicSalary: 20000, hra: 8000, allowance: 2000 });
    }
    await request(app).post('/api/v1/payroll/runs').set('Authorization', `Bearer ${adminToken}`).send({ month: 7, year: 2026 });

    const adminView = await request(app).get('/api/v1/payroll/payslips').set('Authorization', `Bearer ${adminToken}`);
    expect(adminView.body.data).toHaveLength(2);

    const ownView = await request(app).get('/api/v1/payroll/payslips').set('Authorization', `Bearer ${worker.token}`);
    expect(ownView.body.data).toHaveLength(1);
    expect(ownView.body.data[0].employeeId).toBe(worker.employeeId);

    const peekRes = await request(app)
      .get(`/api/v1/payroll/payslips?employeeId=${other.employeeId}`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(peekRes.status).toBe(403);
  });

  it('blocks a plain employee from managing payroll and isolates tenants', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ month: 7, year: 2026 });
    expect(forbiddenRes.status).toBe(403);

    await request(app)
      .post('/api/v1/payroll/salary-structures')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId, effectiveFrom: '2026-01-01', basicSalary: 20000, hra: 8000, allowance: 2000 });
    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 7, year: 2026 });

    const { res: signupB } = await signupTenant();
    const tokenB = signupB.body.data.accessToken;
    const crossTenantRes = await request(app)
      .get(`/api/v1/payroll/runs/${runRes.body.data.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(crossTenantRes.status).toBe(404);
  });

  it('refuses to generate a run when nobody has a salary structure', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    await createEmployeeAccount(me.body.data.tenant.id, domain);

    const runRes = await request(app)
      .post('/api/v1/payroll/runs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 7, year: 2026 });
    expect(runRes.status).toBe(400);
  });
});
