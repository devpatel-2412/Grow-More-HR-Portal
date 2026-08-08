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
  await prisma.sopRevision.deleteMany();
  await prisma.sop.deleteMany();
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
  await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
  });
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

describe('SOP library', () => {
  it('walks an SOP through create → publish → revise → archive, enforcing the document-control rules', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/sops')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ title: 'Onboarding checklist', body: 'Step 1: welcome the new hire.' });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/sops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Onboarding checklist', body: 'Step 1: welcome the new hire.' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('DRAFT');
    const sopId = createRes.body.data.id;

    // Anyone can read.
    const readRes = await request(app).get(`/api/v1/sops/${sopId}`).set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.status).toBe(200);

    // Draft edits overwrite in place — no revision yet.
    await request(app)
      .patch(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Step 1: welcome. Step 2: issue a badge.' });
    const noRevisionsYetRes = await request(app)
      .get(`/api/v1/sops/${sopId}/revisions`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(noRevisionsYetRes.body.data).toHaveLength(0);

    const publishRes = await request(app).post(`/api/v1/sops/${sopId}/publish`).set('Authorization', `Bearer ${adminToken}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe('PUBLISHED');

    const doublePublishRes = await request(app).post(`/api/v1/sops/${sopId}/publish`).set('Authorization', `Bearer ${adminToken}`);
    expect(doublePublishRes.status).toBe(409);

    // A body edit on a published SOP creates a revision and bumps the version.
    const reviseRes = await request(app)
      .patch(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'Step 1: welcome. Step 2: issue a badge. Step 3: assign a buddy.' });
    expect(reviseRes.status).toBe(200);
    expect(reviseRes.body.data.version).toBe(2);

    const revisionsRes = await request(app).get(`/api/v1/sops/${sopId}/revisions`).set('Authorization', `Bearer ${adminToken}`);
    expect(revisionsRes.body.data).toHaveLength(1);
    expect(revisionsRes.body.data[0].version).toBe(1);
    expect(revisionsRes.body.data[0].body).toBe('Step 1: welcome. Step 2: issue a badge.');

    // Cannot delete a published SOP outright.
    const blockedDeleteRes = await request(app).delete(`/api/v1/sops/${sopId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDeleteRes.status).toBe(409);

    const archiveRes = await request(app).post(`/api/v1/sops/${sopId}/archive`).set('Authorization', `Bearer ${adminToken}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.status).toBe('ARCHIVED');

    // An archived SOP can no longer be edited.
    const editArchivedRes = await request(app)
      .patch(`/api/v1/sops/${sopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ body: 'too late' });
    expect(editArchivedRes.status).toBe(409);
  });
});
