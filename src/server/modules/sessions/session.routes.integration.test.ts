/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 * See auth.routes.integration.test.ts for setup instructions — same DATABASE_URL requirement.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../shared/utils/hash.util.js';

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

function uniqueDomain(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function signupTenant(overrides: Partial<Record<string, string>> = {}, userAgent?: string) {
  const domain = uniqueDomain('acme');
  let req = request(app)
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
  if (userAgent) req = req.set('User-Agent', userAgent);
  const res = await req;
  return { res, domain };
}

/** Mirrors the pattern in workplace.routes.integration.test.ts — a genuine EMPLOYEE-role login,
 * not a DB-only role edit (which wouldn't affect an already-issued access token's baked-in role). */
async function loginAsEmployee(tenantId: string, domain: string) {
  const email = `worker-${domain}@acme.com`;
  const password = 'CorrectPassword123';
  await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
  });
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken as string;
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

describe('Sessions — dashboard listing', () => {
  it('lists the active session created at signup, with browser/device parsed from the user agent', async () => {
    const { res: signupRes } = await signupTenant(
      {},
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
    );
    const accessToken = signupRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/sessions').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].userName).toBe('Ada Admin');
    expect(res.body.data[0].browser).toBe('Chrome');
    expect(res.body.data[0].device).toBe('Windows PC');
  });

  it('denies a non-admin (EMPLOYEE) from viewing the sessions dashboard', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.data.accessToken}`);
    const employeeToken = await loginAsEmployee(meRes.body.data.tenant.id, domain);

    const res = await request(app).get('/api/v1/sessions').set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('never lists another tenant\'s sessions', async () => {
    const { res: tenantARes } = await signupTenant();
    await signupTenant();

    const res = await request(app).get('/api/v1/sessions').set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].userId).toBe(tenantARes.body.data.user.id);
  });
});

describe('Sessions — force logout a user', () => {
  it("revokes the target user's refresh token so their session cookie stops working", async () => {
    const { res: signupRes } = await signupTenant();
    const accessToken = signupRes.body.data.accessToken;
    const userId = signupRes.body.data.user.id;
    const cookie = signupRes.headers['set-cookie'][0];

    const forceLogoutRes = await request(app)
      .post(`/api/v1/sessions/users/${userId}/force-logout`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(forceLogoutRes.status).toBe(204);

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(401);
  });

  it("404s when the target user id belongs to a different tenant", async () => {
    const { res: tenantARes } = await signupTenant();
    const { res: tenantBRes } = await signupTenant();

    const res = await request(app)
      .post(`/api/v1/sessions/users/${tenantBRes.body.data.user.id}/force-logout`)
      .set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Sessions — force logout all', () => {
  it('ends every existing session tenant-wide, but a session started afterward still works', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const accessToken = signupRes.body.data.accessToken;
    const preCookie = signupRes.headers['set-cookie'][0];

    const forceLogoutAllRes = await request(app)
      .post('/api/v1/sessions/force-logout-all')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(forceLogoutAllRes.status).toBe(204);

    const staleRefreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', preCookie);
    expect(staleRefreshRes.status).toBe(401);

    // A brand new login after the force-logout-all instant must still succeed.
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `admin-${domain}@acme.com`, password: 'CorrectPassword123' });
    expect(loginRes.status).toBe(200);
  });

  it('denies a non-admin from force-logging-out the whole tenant', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.data.accessToken}`);
    const employeeToken = await loginAsEmployee(meRes.body.data.tenant.id, domain);

    const res = await request(app).post('/api/v1/sessions/force-logout-all').set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });
});
