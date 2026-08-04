/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 * See auth.routes.integration.test.ts's header comment for setup commands — same requirements.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../../shared/utils/hash.util.js';
import { emailService } from '../../shared/email/email.service.js';

const app = createApp();

async function resetDatabase() {
  await prisma.financePayment.deleteMany();
  await prisma.financeLineItem.deleteMany();
  await prisma.financeDocument.deleteMany();
  await prisma.project.deleteMany();
  await prisma.clientContact.deleteMany();
  await prisma.clientPortal.deleteMany();
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
  await prisma.user.create({
    data: { email, passwordHash: hashPassword(password), role: 'EMPLOYEE', status: 'ACTIVE', tenantId },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string };
}

/** Invites a CLIENT-role portal user and drives them through acceptance, returning their session token. */
async function inviteAndAcceptPortalUser(adminToken: string, clientPortalId: string, email: string) {
  const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue();
  const inviteRes = await request(app)
    .post('/api/v1/users/invite')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email, role: 'CLIENT', clientPortalId });
  expect(inviteRes.status).toBe(201);

  const emailText = sendSpy.mock.calls.at(-1)![0].text;
  const token = emailText.split(': ').at(-1)!.trim();
  sendSpy.mockRestore();

  const acceptRes = await request(app)
    .post('/api/v1/users/invite/accept')
    .send({ token, password: 'CorrectPassword123', firstName: 'Cara', lastName: 'Client' });
  expect(acceptRes.status).toBe(200);

  const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'CorrectPassword123' });
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

describe('Customer portal', () => {
  it('invites a portal user, accepts without creating an EmployeeProfile, and scopes their reads to their own client', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain);

    const clientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Umbrella Co', contactEmail: `umbrella-${domain}@example.com` });
    expect(clientRes.status).toBe(201);
    const clientPortalId = clientRes.body.data.id;

    const otherClientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Other Co', contactEmail: `other-${domain}@example.com` });
    const otherClientPortalId = otherClientRes.body.data.id;

    const portal = await inviteAndAcceptPortalUser(adminToken, clientPortalId, `portal-${domain}@example.com`);

    // Accepting a CLIENT invite must not create an EmployeeProfile.
    const employeeProfileCount = await prisma.employeeProfile.count({ where: { tenantId } });
    expect(employeeProfileCount).toBe(1); // only the pre-existing `worker` account

    const meRes = await request(app).get('/api/v1/client-portal/me').set('Authorization', `Bearer ${portal.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.companyName).toBe('Umbrella Co');

    // A plain employee gets no access to the client-portal routes at all.
    const employeeBlockedRes = await request(app).get('/api/v1/client-portal/me').set('Authorization', `Bearer ${worker.token}`);
    expect(employeeBlockedRes.status).toBe(403);

    // Conversely, a CLIENT login must be blocked from every internal-staff module — these are
    // "any authenticated tenant member" reads, not permission-gated, so requireStaff is the only guard.
    const sopBlockedRes = await request(app).get('/api/v1/sops').set('Authorization', `Bearer ${portal.token}`);
    expect(sopBlockedRes.status).toBe(403);
    const vendorBlockedRes = await request(app).get('/api/v1/vendors').set('Authorization', `Bearer ${portal.token}`);
    expect(vendorBlockedRes.status).toBe(403);
    const kbBlockedRes = await request(app).get('/api/v1/kb-articles').set('Authorization', `Bearer ${portal.token}`);
    expect(kbBlockedRes.status).toBe(403);
    // And the tenant-wide staff project list is blocked even though /client-portal/projects (below) is not.
    const staffProjectsBlockedRes = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${portal.token}`);
    expect(staffProjectsBlockedRes.status).toBe(403);

    // Finance document issued to this client is visible; scoped correctly by clientPortalId.
    const invoiceRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INVOICE',
        issueDate: '2026-01-01',
        clientPortalId,
        lineItems: [{ description: 'Consulting', quantity: 1, unitPrice: 500 }],
      });
    expect(invoiceRes.status).toBe(201);

    await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INVOICE',
        issueDate: '2026-01-01',
        clientPortalId: otherClientPortalId,
        lineItems: [{ description: 'Unrelated', quantity: 1, unitPrice: 999 }],
      });

    const invoicesRes = await request(app)
      .get('/api/v1/client-portal/finance-documents')
      .set('Authorization', `Bearer ${portal.token}`);
    expect(invoicesRes.status).toBe(200);
    expect(invoicesRes.body.data).toHaveLength(1);
    expect(invoicesRes.body.data[0].id).toBe(invoiceRes.body.data.id);

    const invoiceDetailRes = await request(app)
      .get(`/api/v1/client-portal/finance-documents/${invoiceRes.body.data.id}`)
      .set('Authorization', `Bearer ${portal.token}`);
    expect(invoiceDetailRes.status).toBe(200);
    expect(invoiceDetailRes.body.data.lineItems).toHaveLength(1);

    // Project linked to this client via PATCH is visible; an unlinked project is not.
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Umbrella Website Revamp', startDate: '2026-01-01' });
    await request(app)
      .patch(`/api/v1/projects/${projectRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ clientPortalId });

    await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Unrelated internal project', startDate: '2026-01-01' });

    const projectsRes = await request(app).get('/api/v1/client-portal/projects').set('Authorization', `Bearer ${portal.token}`);
    expect(projectsRes.status).toBe(200);
    expect(projectsRes.body.data).toHaveLength(1);
    expect(projectsRes.body.data[0].name).toBe('Umbrella Website Revamp');
  });
});
