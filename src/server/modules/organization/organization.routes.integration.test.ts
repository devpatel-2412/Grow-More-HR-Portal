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
      department: 'Ops',
      designation: 'Staff',
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

describe('Branches', () => {
  it('lets any employee read but only ORG_MANAGE holders write, and blocks deleting a branch in use', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ name: 'HQ', code: 'HQ' });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Headquarters', code: 'HQ', city: 'Mumbai', isHeadOffice: true });
    expect(createRes.status).toBe(201);
    const branchId = createRes.body.data.id;

    const duplicateRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Another', code: 'HQ' });
    expect(duplicateRes.status).toBe(409);

    const readRes = await request(app).get('/api/v1/branches').set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data).toHaveLength(1);

    // Assign the worker to the branch, then deletion must be blocked.
    await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchId });

    const blockedDeleteRes = await request(app)
      .delete(`/api/v1/branches/${branchId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDeleteRes.status).toBe(409);

    // Unassign, then deletion succeeds.
    await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchId: null });

    const deleteRes = await request(app)
      .delete(`/api/v1/branches/${branchId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);
  });
});

describe('Teams', () => {
  it('creates a team under a branch with a lead, and blocks deleting a team with members', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const lead = await createEmployeeAccount(tenantId, domain);
    const member = await createEmployeeAccount(tenantId, domain);

    const branchRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Headquarters', code: 'HQ' });
    const branchId = branchRes.body.data.id;

    const createRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Platform', branchId, leadId: lead.employeeId });
    expect(createRes.status).toBe(201);
    const teamId = createRes.body.data.id;
    expect(createRes.body.data.branchId).toBe(branchId);
    expect(createRes.body.data.leadId).toBe(lead.employeeId);

    const duplicateRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Platform' });
    expect(duplicateRes.status).toBe(409);

    await request(app)
      .patch(`/api/v1/employees/${member.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teamId });

    const blockedDeleteRes = await request(app)
      .delete(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDeleteRes.status).toBe(409);

    await request(app)
      .patch(`/api/v1/employees/${member.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teamId: null });

    const deleteRes = await request(app)
      .delete(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);
  });
});
