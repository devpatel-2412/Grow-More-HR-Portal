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

async function signupTenant(overrides: Partial<Record<string, string>> = {}) {
  const domain = uniqueDomain('acme');
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .send({
      tenantName: 'Acme Inc',
      tenantDomain: domain,
      email: overrides.email ?? `admin-${domain}@acme.com`,
      password: 'CorrectPassword123',
      firstName: 'Ada',
      lastName: 'Admin',
      ...overrides,
    });
  return { res, domain };
}

async function createEmployeeAccount(tenantId: string, domain: string) {
  const email = `worker-${domain}-${Date.now()}@acme.com`;
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

describe('Projects & Tasks — full flow', () => {
  it('creates a project, a task, assigns it, and the assignee can move it through the board', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const adminMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = adminMe.body.data.tenant.id;
    const { token: workerToken, employeeId: workerEmployeeId } = await createEmployeeAccount(tenantId, domain);

    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Website Relaunch', startDate: '2026-03-01' });
    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.data.id;

    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId, title: 'Design homepage', priority: 'HIGH', assignedToId: workerEmployeeId });
    expect(taskRes.status).toBe(201);
    expect(taskRes.body.data.status).toBe('TODO');
    const taskId = taskRes.body.data.id;

    // The assignee (a plain EMPLOYEE, no TASK_MANAGE) can move their own task's status.
    const statusRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('IN_PROGRESS');

    // But the same assignee cannot reassign the task to someone else.
    const reassignRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ assignedToId: null });
    expect(reassignRes.status).toBe(403);
  });

  it('assigning a task notifies the assignee, and the notification can be listed and marked read', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const adminMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = adminMe.body.data.tenant.id;
    const { token: workerToken, employeeId: workerEmployeeId } = await createEmployeeAccount(tenantId, domain);

    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Website Relaunch', startDate: '2026-03-01' });
    const projectId = projectRes.body.data.id;

    // No notification yet — the worker has no unread count before anything is assigned.
    const beforeCount = await request(app).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${workerToken}`);
    expect(beforeCount.body.data.count).toBe(0);

    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId, title: 'Design homepage', assignedToId: workerEmployeeId });
    expect(taskRes.status).toBe(201);

    const afterCount = await request(app).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${workerToken}`);
    expect(afterCount.body.data.count).toBe(1);

    const listRes = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${workerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]).toMatchObject({ type: 'TASK_ASSIGNED', body: 'Design homepage', link: `/projects/${projectId}` });
    const notificationId = listRes.body.data[0].id;

    // The admin who created the task has no notifications of their own.
    const adminListRes = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${adminToken}`);
    expect(adminListRes.body.data).toHaveLength(0);

    // A different employee cannot mark someone else's notification as read.
    const { token: bystanderToken } = await createEmployeeAccount(tenantId, domain);
    const forbiddenReadRes = await request(app)
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${bystanderToken}`);
    expect(forbiddenReadRes.status).toBe(403);

    const readRes = await request(app)
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.readAt).not.toBeNull();

    const finalCount = await request(app).get('/api/v1/notifications/unread-count').set('Authorization', `Bearer ${workerToken}`);
    expect(finalCount.body.data.count).toBe(0);
  });

  it('a comment and a milestone can be added, and the board list filters by project', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ops Cleanup', startDate: '2026-04-01' });
    const projectId = projectRes.body.data.id;

    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId, title: 'Archive old tickets' });
    const taskId = taskRes.body.data.id;

    const commentRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Starting on this now' });
    expect(commentRes.status).toBe(201);

    const milestoneRes = await request(app)
      .post(`/api/v1/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Phase 1 complete', dueDate: '2026-05-01' });
    expect(milestoneRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/tasks?projectId=${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].id).toBe(taskId);
  });

  it('a non-manager cannot create a project', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminMe = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${signupRes.body.data.accessToken}`);
    const { token: workerToken } = await createEmployeeAccount(adminMe.body.data.tenant.id, domain);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ name: 'Should fail', startDate: '2026-01-01' });
    expect(res.status).toBe(403);
  });
});

describe('Projects & Tasks — tenant isolation', () => {
  it("an admin from tenant A cannot fetch tenant B's project by id", async () => {
    const { res: tenantARes } = await signupTenant();
    const { res: tenantBRes } = await signupTenant();

    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tenantBRes.body.data.accessToken}`)
      .send({ name: 'Tenant B project', startDate: '2026-01-01' });

    const res = await request(app)
      .get(`/api/v1/projects/${projectRes.body.data.id}`)
      .set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);
    expect(res.status).toBe(404);
  });
});
