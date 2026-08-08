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

async function createEmployeeAccount(tenantId: string, domain: string, withProfile = false) {
  const email = `worker-${domain}-${Math.random().toString(36).slice(2, 8)}@acme.com`;
  const password = 'CorrectPassword123';
  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
  });
  if (withProfile) {
    await prisma.employeeProfile.create({
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
  }
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string };
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

describe('GET /dashboard/admin-summary', () => {
  it('returns org-wide KPIs for an admin and 403s a plain employee', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const adminRes = await request(app).get('/api/v1/dashboard/admin-summary').set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    // The signing-up admin itself is an ACTIVE employee — headcount should reflect at least that one.
    expect(adminRes.body.data.headcount.total).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.data.headcount.active).toBeGreaterThanOrEqual(1);
    expect(adminRes.body.data).toHaveProperty('attendanceToday');
    expect(adminRes.body.data).toHaveProperty('projects');
    expect(adminRes.body.data).toHaveProperty('payroll');
    expect(adminRes.body.data).toHaveProperty('recentActivity');

    const employeeRes = await request(app).get('/api/v1/dashboard/admin-summary').set('Authorization', `Bearer ${worker.token}`);
    expect(employeeRes.status).toBe(403);
  });

  it('isolates headcount between tenants — one tenant never sees another tenant\'s numbers', async () => {
    const { res: tenantARes, domain: domainA } = await signupTenant();
    const tenantAToken = tenantARes.body.data.accessToken;
    const meA = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${tenantAToken}`);
    await createEmployeeAccount(meA.body.data.tenant.id, domainA, true);
    await createEmployeeAccount(meA.body.data.tenant.id, domainA, true);

    const { res: tenantBRes } = await signupTenant();
    const tenantBToken = tenantBRes.body.data.accessToken;

    const summaryA = await request(app).get('/api/v1/dashboard/admin-summary').set('Authorization', `Bearer ${tenantAToken}`);
    const summaryB = await request(app).get('/api/v1/dashboard/admin-summary').set('Authorization', `Bearer ${tenantBToken}`);

    // Tenant A: its own admin + 2 seeded employees = 3. Tenant B: just its own admin = 1.
    expect(summaryA.body.data.headcount.total).toBe(3);
    expect(summaryB.body.data.headcount.total).toBe(1);
  });
});
