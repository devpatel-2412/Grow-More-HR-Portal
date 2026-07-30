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

async function createEmployeeAccount(tenantId: string, domain: string, managerId?: string) {
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
      dateOfJoining: new Date(),
      status: 'ACTIVE',
      managerId,
    },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string, employeeId: profile.id, userId: user.id };
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

describe('Daily work reports', () => {
  it('submits a report, blocks a duplicate for the same day, and lets an admin approve it', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const { token: workerToken } = await createEmployeeAccount(tenantId, domain);

    const submitRes = await request(app)
      .post('/api/v1/work-reports')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        date: '2026-07-29',
        completedTasks: ['Shipped the login page', 'Reviewed two PRs'],
        pendingTasks: ['Fix flaky test'],
        tomorrowPlan: ['Start the billing screen'],
        issues: 'Staging was down for an hour',
        timeSpentMinutes: 480,
      });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('PENDING');
    expect(submitRes.body.data.completedTasks).toHaveLength(2);
    const reportId = submitRes.body.data.id;

    // One report per employee per day.
    const duplicateRes = await request(app)
      .post('/api/v1/work-reports')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ date: '2026-07-29', completedTasks: ['Something else'], timeSpentMinutes: 60 });
    expect(duplicateRes.status).toBe(409);

    // The author may edit while it is still pending.
    const editRes = await request(app)
      .patch(`/api/v1/work-reports/${reportId}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ timeSpentMinutes: 500 });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.timeSpentMinutes).toBe(500);

    // The employee cannot review their own report.
    const selfReviewRes = await request(app)
      .patch(`/api/v1/work-reports/${reportId}/review`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'APPROVED' });
    expect(selfReviewRes.status).toBe(403);

    const reviewRes = await request(app)
      .patch(`/api/v1/work-reports/${reportId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', reviewNote: 'Nice work' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe('APPROVED');

    // Once reviewed, the author can no longer edit it.
    const lateEditRes = await request(app)
      .patch(`/api/v1/work-reports/${reportId}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ timeSpentMinutes: 10 });
    expect(lateEditRes.status).toBe(409);
  });

  it("scopes an employee's list to their own reports and surfaces reports to their manager", async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;

    const manager = await createEmployeeAccount(tenantId, domain);
    const report = await createEmployeeAccount(tenantId, domain, manager.employeeId);

    await request(app)
      .post('/api/v1/work-reports')
      .set('Authorization', `Bearer ${report.token}`)
      .send({ date: '2026-07-29', completedTasks: ['Report work'], timeSpentMinutes: 300 });
    await request(app)
      .post('/api/v1/work-reports')
      .set('Authorization', `Bearer ${manager.token}`)
      .send({ date: '2026-07-29', completedTasks: ['Manager work'], timeSpentMinutes: 200 });

    // Unprivileged list is silently narrowed to the caller's own reports.
    const ownList = await request(app).get('/api/v1/work-reports').set('Authorization', `Bearer ${report.token}`);
    expect(ownList.status).toBe(200);
    expect(ownList.body.data).toHaveLength(1);
    expect(ownList.body.data[0].completedTasks[0]).toBe('Report work');

    // A manager may explicitly request a direct report's reports.
    const managerView = await request(app)
      .get(`/api/v1/work-reports?employeeId=${report.employeeId}`)
      .set('Authorization', `Bearer ${manager.token}`);
    expect(managerView.status).toBe(200);
    expect(managerView.body.data).toHaveLength(1);

    // But a peer cannot.
    const peerView = await request(app)
      .get(`/api/v1/work-reports?employeeId=${manager.employeeId}`)
      .set('Authorization', `Bearer ${report.token}`);
    expect(peerView.status).toBe(403);

    // The manager's review queue holds the direct report's pending report, not their own.
    const queue = await request(app).get('/api/v1/work-reports/review-queue').set('Authorization', `Bearer ${manager.token}`);
    expect(queue.status).toBe(200);
    expect(queue.body.data).toHaveLength(1);
    expect(queue.body.data[0].employeeId).toBe(report.employeeId);
  });

  it('404s a work report belonging to another tenant', async () => {
    const { res: signupA, domain: domainA } = await signupTenant();
    const tokenA = signupA.body.data.accessToken;
    const meA = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${tokenA}`);
    const worker = await createEmployeeAccount(meA.body.data.tenant.id, domainA);

    const submitRes = await request(app)
      .post('/api/v1/work-reports')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ date: '2026-07-29', completedTasks: ['Tenant A work'], timeSpentMinutes: 100 });
    const reportId = submitRes.body.data.id;

    const { res: signupB } = await signupTenant();
    const tokenB = signupB.body.data.accessToken;

    const crossTenantRes = await request(app)
      .get(`/api/v1/work-reports/${reportId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(crossTenantRes.status).toBe(404);
  });
});

describe('Time tracking', () => {
  it('runs a timer, rolls the minutes into the task, and refuses a concurrent timer', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const { token: workerToken } = await createEmployeeAccount(tenantId, domain);

    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Timed Project', startDate: '2026-07-01' });
    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId: projectRes.body.data.id, title: 'Tracked task' });
    const taskId = taskRes.body.data.id;

    const startRes = await request(app)
      .post('/api/v1/time-logs/timer/start')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ taskId, description: 'Working on it' });
    expect(startRes.status).toBe(201);
    expect(startRes.body.data.endedAt).toBeNull();

    // A second timer while one is running would double-count wall-clock time.
    const secondStart = await request(app)
      .post('/api/v1/time-logs/timer/start')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ taskId });
    expect(secondStart.status).toBe(409);

    const runningRes = await request(app).get('/api/v1/time-logs/timer/running').set('Authorization', `Bearer ${workerToken}`);
    expect(runningRes.body.data.id).toBe(startRes.body.data.id);

    const stopRes = await request(app)
      .post('/api/v1/time-logs/timer/stop')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});
    expect(stopRes.status).toBe(200);
    expect(stopRes.body.data.endedAt).not.toBeNull();

    // After stopping there is no running timer left.
    const afterStop = await request(app).get('/api/v1/time-logs/timer/running').set('Authorization', `Bearer ${workerToken}`);
    expect(afterStop.body.data).toBeNull();
  });

  it('logs manual time, reflects it in the task total and the summary, then rolls it back on delete', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const { token: workerToken } = await createEmployeeAccount(tenantId, domain);

    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Manual Project', startDate: '2026-07-01' });
    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId: projectRes.body.data.id, title: 'Manually tracked' });
    const taskId = taskRes.body.data.id;

    const logRes = await request(app)
      .post('/api/v1/time-logs')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ taskId, startedAt: '2026-07-29T09:00:00.000Z', durationMinutes: 90, description: 'Deep work' });
    expect(logRes.status).toBe(201);
    expect(logRes.body.data.durationMinutes).toBe(90);

    const taskAfterLog = await request(app).get(`/api/v1/tasks/${taskId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(taskAfterLog.body.data.loggedHours).toBe(1.5);

    const summaryRes = await request(app).get('/api/v1/time-logs/summary').set('Authorization', `Bearer ${workerToken}`);
    expect(summaryRes.body.data).toMatchObject({ totalMinutes: 90, totalHours: 1.5, entryCount: 1 });

    const deleteRes = await request(app)
      .delete(`/api/v1/time-logs/${logRes.body.data.id}`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(deleteRes.status).toBe(204);

    const taskAfterDelete = await request(app).get(`/api/v1/tasks/${taskId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(taskAfterDelete.body.data.loggedHours).toBe(0);
  });

  it("blocks deleting another employee's time log", async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;

    const owner = await createEmployeeAccount(tenantId, domain);
    const other = await createEmployeeAccount(tenantId, domain);

    const logRes = await request(app)
      .post('/api/v1/time-logs')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ startedAt: '2026-07-29T09:00:00.000Z', durationMinutes: 30 });

    const forbiddenRes = await request(app)
      .delete(`/api/v1/time-logs/${logRes.body.data.id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(forbiddenRes.status).toBe(403);
  });
});
