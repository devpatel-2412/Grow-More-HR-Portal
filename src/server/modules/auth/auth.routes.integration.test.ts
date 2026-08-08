/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 *
 * Requires DATABASE_URL (see vitest.integration.config.ts) to point at the isolated `test`
 * schema in Supabase — never `public`, since these tests truncate tables between runs. See
 * "Running tests" in docs/module-1-foundation/deployment.md for the one-time schema setup. Run via:
 *   DATABASE_URL="<Supabase DATABASE_URL>&schema=test" npx vitest run src/server/modules/auth/auth.routes.integration.test.ts
 *
 * Not run as part of the default `npm test` unit suite — see package.json's `test:integration` script.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
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

function uniqueDomain(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
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

describe('Auth flow — signup, login, me, refresh, logout', () => {
  it('bootstraps a tenant + admin fixture and returns a working access token + refresh cookie', async () => {
    const { res } = await signupTenant();

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=/);
  });

  it('logs in with the created account and fetches /me', async () => {
    const domain = uniqueDomain('acme');
    const email = `admin-${domain}@acme.com`;
    await signupTenant({ tenantDomain: domain, email });

    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'CorrectPassword123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);
    expect(meRes.body.data.tenant.domain).toBe(domain);
  });

  it('rejects login with the wrong password', async () => {
    const domain = uniqueDomain('acme');
    const email = `admin-${domain}@acme.com`;
    await signupTenant({ tenantDomain: domain, email });

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('rotates the refresh token on /refresh and the old cookie no longer works', async () => {
    const { res: signupRes } = await signupTenant();
    const cookie = signupRes.headers['set-cookie'][0];

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();

    // Reusing the original (now-rotated) cookie must be treated as theft and rejected.
    const reuseRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reuseRes.status).toBe(401);
  });

  it('logs out and revokes the refresh token so it can no longer be used', async () => {
    const { res: signupRes } = await signupTenant();
    const cookie = signupRes.headers['set-cookie'][0];
    const accessToken = signupRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookie);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("lists the caller's own successful and failed login attempts, and never another user's", async () => {
    const domainA = uniqueDomain('acme');
    const emailA = `admin-${domainA}@acme.com`;
    const signupA = await signupTenant({ tenantDomain: domainA, email: emailA });
    const tokenA = signupA.res.body.data.accessToken;

    // One more successful login, plus one failed attempt, both against account A.
    await request(app).post('/api/v1/auth/login').send({ email: emailA, password: 'CorrectPassword123' });
    await request(app).post('/api/v1/auth/login').send({ email: emailA, password: 'WrongPassword!' });

    // A second, unrelated tenant/account — its own login history must stay isolated.
    const { res: signupB } = await signupTenant();
    const tokenB = signupB.body.data.accessToken;

    const historyA = await request(app).get('/api/v1/auth/login-history').set('Authorization', `Bearer ${tokenA}`);
    expect(historyA.status).toBe(200);
    // signup itself doesn't record a login-history entry, only the two explicit /login calls above.
    expect(historyA.body.data).toHaveLength(2);
    expect(historyA.body.data.map((e: { action: string }) => e.action).sort()).toEqual(['USER_LOGIN_FAILURE', 'USER_LOGIN_SUCCESS']);

    const historyB = await request(app).get('/api/v1/auth/login-history').set('Authorization', `Bearer ${tokenB}`);
    expect(historyB.status).toBe(200);
    expect(historyB.body.data).toHaveLength(0);
  });
});

describe('Session cookie persistence — Remember Me', () => {
  it('sets a true browser-session cookie (no Expires) when Remember Me is unchecked', async () => {
    const domain = uniqueDomain('acme');
    const email = `admin-${domain}@acme.com`;
    await signupTenant({ tenantDomain: domain, email });

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'CorrectPassword123', rememberMe: false });

    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).not.toMatch(/Expires=/i);
  });

  it('sets a persistent cookie (with Expires) when Remember Me is checked', async () => {
    const domain = uniqueDomain('acme');
    const email = `admin-${domain}@acme.com`;
    await signupTenant({ tenantDomain: domain, email });

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'CorrectPassword123', rememberMe: true });

    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/Expires=/i);
  });

  it('carries rememberMe forward as a persistent cookie across token rotation', async () => {
    const domain = uniqueDomain('acme');
    const email = `admin-${domain}@acme.com`;
    await signupTenant({ tenantDomain: domain, email });
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'CorrectPassword123', rememberMe: true });
    const cookie = loginRes.headers['set-cookie'][0];

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.headers['set-cookie'][0]).toMatch(/Expires=/i);
  });
});

describe('Inactivity timeout enforcement (server-side backstop)', () => {
  it('rejects /refresh once the session has been idle longer than the tenant-configured timeout', async () => {
    const { res: signupRes } = await signupTenant();
    const cookie = signupRes.headers['set-cookie'][0];
    const accessToken = signupRes.body.data.accessToken;

    const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    const tenantId = meRes.body.data.tenant.id;

    await prisma.tenant.update({ where: { id: tenantId }, data: { sessionTimeoutMinutes: 15 } });
    await prisma.refreshToken.updateMany({
      where: { userId: signupRes.body.data.user.id },
      data: { lastUsedAt: new Date(Date.now() - 16 * 60_000) },
    });

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(401);
  });

  it('allows /refresh when idle time is within the configured timeout', async () => {
    const { res: signupRes } = await signupTenant();
    const cookie = signupRes.headers['set-cookie'][0];
    const accessToken = signupRes.body.data.accessToken;

    const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    const tenantId = meRes.body.data.tenant.id;

    await prisma.tenant.update({ where: { id: tenantId }, data: { sessionTimeoutMinutes: 60 } });
    await prisma.refreshToken.updateMany({
      where: { userId: signupRes.body.data.user.id },
      data: { lastUsedAt: new Date(Date.now() - 5 * 60_000) },
    });

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(200);
  });
});

describe('RBAC — role/permission denial', () => {
  it('denies a non-SUPER_ADMIN from listing all tenants', async () => {
    const { res: signupRes } = await signupTenant();
    const res = await request(app)
      .get('/api/v1/tenants')
      .set('Authorization', `Bearer ${signupRes.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('denies an unauthenticated request to a protected route', async () => {
    const res = await request(app).get('/api/v1/employees/me');
    expect(res.status).toBe(401);
  });
});

describe('Tenant isolation', () => {
  it('a user from tenant A cannot read a tenant B user via GET /users/:id', async () => {
    const { res: tenantARes } = await signupTenant();
    const { res: tenantBRes } = await signupTenant();

    const tenantBUserId = tenantBRes.body.data.user.id;

    const res = await request(app)
      .get(`/api/v1/users/${tenantBUserId}`)
      .set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);

    // getById scopes strictly by the caller's tenantId, so a cross-tenant id looks not-found.
    expect(res.status).toBe(404);
  });

  it('a user from tenant A only sees tenant A users when listing', async () => {
    const { res: tenantARes } = await signupTenant();
    await signupTenant();

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tenantARes.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(tenantARes.body.data.user.id);
  });
});
