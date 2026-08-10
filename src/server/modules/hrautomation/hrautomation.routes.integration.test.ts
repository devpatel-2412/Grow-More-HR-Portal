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

async function createEmployeeAccount(tenantId: string, domain: string, department = 'Engineering') {
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
      department,
      designation: 'Engineer',
      dateOfJoining: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { token: login.body.data.accessToken as string, employeeId: profile.id, email };
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

describe('HR automation — templates', () => {
  it('creates a letter template and generates a filled document for a real employee', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const createRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Offer Letter',
        type: 'LETTER_OFFER',
        bodyTemplate: 'Dear {{firstName}} {{lastName}}, we are pleased to offer you the role of {{designation}} at {{companyName}}.',
      });
    expect(createRes.status).toBe(201);
    const templateId = createRes.body.data.id;

    const generateRes = await request(app)
      .post(`/api/v1/templates/${templateId}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });
    expect(generateRes.status).toBe(201);
    expect(generateRes.body.data.renderedContent).toBe(
      'Dear Wanda Worker, we are pleased to offer you the role of Engineer at Acme Inc.',
    );

    const historyRes = await request(app)
      .get(`/api/v1/templates/generated-documents?employeeId=${worker.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data).toHaveLength(1);
  });

  it('rejects a poster template with no background and a letter template with no body', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const noBackgroundRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Missing bg', type: 'POSTER_WELCOME' });
    expect(noBackgroundRes.status).toBe(400);

    const noBodyRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Missing body', type: 'LETTER_OFFER' });
    expect(noBodyRes.status).toBe(400);
  });

  it('renders poster layout fields with resolved employee values', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const createRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Welcome Poster',
        type: 'POSTER_WELCOME',
        backgroundUrl: 'https://files.example.com/welcome-bg.png',
        layoutFields: [{ id: 'f1', variableKey: 'firstName', x: 100, y: 200 }],
      });
    expect(createRes.status).toBe(201);

    const generateRes = await request(app)
      .post(`/api/v1/templates/${createRes.body.data.id}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });
    expect(generateRes.status).toBe(201);
    const rendered = JSON.parse(generateRes.body.data.renderedContent);
    // fontSize/color/fontWeight are filled in by the validator's defaults, not supplied here.
    expect(rendered).toEqual([
      { id: 'f1', variableKey: 'firstName', x: 100, y: 200, fontSize: 16, color: '#000000', fontWeight: 'normal', text: 'Wanda' },
    ]);
  });

  it('downloads a real PDF for a letter document but refuses one for a poster', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const letterRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Relieving Letter', type: 'LETTER_RELIEVING', bodyTemplate: 'Dear {{firstName}}, this confirms your relieving.' });
    const letterDocRes = await request(app)
      .post(`/api/v1/templates/${letterRes.body.data.id}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });

    const pdfRes = await request(app)
      .get(`/api/v1/templates/generated-documents/${letterDocRes.body.data.id}/pdf`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.headers['content-disposition']).toContain('attachment');
    expect((pdfRes.body as Buffer).subarray(0, 5).toString('latin1')).toBe('%PDF-');

    const posterRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Welcome Poster', type: 'POSTER_WELCOME', backgroundUrl: 'https://files.example.com/bg.png' });
    const posterDocRes = await request(app)
      .post(`/api/v1/templates/${posterRes.body.data.id}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });

    const posterPdfRes = await request(app)
      .get(`/api/v1/templates/generated-documents/${posterDocRes.body.data.id}/pdf`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(posterPdfRes.status).toBe(409);
  });

  it('downloads a real DOCX for a letter document, and the QR-verification link works without any login', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const letterRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Experience Letter', type: 'LETTER_EXPERIENCE', bodyTemplate: 'Dear {{firstName}}, thank you for your service.' });
    const letterDocRes = await request(app)
      .post(`/api/v1/templates/${letterRes.body.data.id}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });
    const documentId = letterDocRes.body.data.id;

    const docxRes = await request(app)
      .get(`/api/v1/templates/generated-documents/${documentId}/docx`)
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(docxRes.status).toBe(200);
    expect(docxRes.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect((docxRes.body as Buffer).subarray(0, 2).toString('latin1')).toBe('PK');

    // A DOCX download requires TEMPLATE_MANAGE, same as the PDF path.
    const forbiddenDocxRes = await request(app)
      .get(`/api/v1/templates/generated-documents/${documentId}/docx`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(forbiddenDocxRes.status).toBe(403);

    // The verification endpoint (what the printed QR code points at) needs no Authorization header at all.
    const verifyRes = await request(app).get(`/api/v1/verify/documents/${documentId}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data).toEqual({
      valid: true,
      documentType: 'Experience Letter',
      employeeName: 'Wanda Worker',
      companyName: 'Acme Inc',
      issuedDate: expect.any(String),
    });

    // A made-up document id is a clean 404, not an internal error.
    const missingVerifyRes = await request(app).get('/api/v1/verify/documents/00000000-0000-0000-0000-000000000000');
    expect(missingVerifyRes.status).toBe(404);
  });

  it("emails the letter's PDF to the employee's registered address but refuses one for a poster", async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);
    const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue();

    const letterRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NOC', type: 'LETTER_NOC', bodyTemplate: 'Dear {{firstName}}, no objection.' });
    const letterDocRes = await request(app)
      .post(`/api/v1/templates/${letterRes.body.data.id}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });

    const emailRes = await request(app)
      .post(`/api/v1/templates/generated-documents/${letterDocRes.body.data.id}/email`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(emailRes.status).toBe(200);
    expect(emailRes.body.data.to).toBe(worker.email);

    expect(sendSpy).toHaveBeenCalledOnce();
    const [message] = sendSpy.mock.calls[0];
    expect(message.to).toBe(worker.email);
    expect(message.subject).toBe('Your No Objection Certificate');
    expect(message.attachments?.[0]?.filename).toMatch(/\.pdf$/);
    expect(message.attachments?.[0]?.content.subarray(0, 5).toString('latin1')).toBe('%PDF-');

    const posterRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Birthday Poster', type: 'POSTER_BIRTHDAY', backgroundUrl: 'https://files.example.com/bg.png' });
    const posterDocRes = await request(app)
      .post(`/api/v1/templates/${posterRes.body.data.id}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });

    const posterEmailRes = await request(app)
      .post(`/api/v1/templates/generated-documents/${posterDocRes.body.data.id}/email`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(posterEmailRes.status).toBe(409);

    sendSpy.mockRestore();
  });

  it('blocks a plain employee from managing templates and isolates tenants', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ name: 'Blocked', type: 'LETTER_OFFER', bodyTemplate: 'x' });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cross', type: 'LETTER_OFFER', bodyTemplate: 'x' });

    const { res: signupB } = await signupTenant();
    const crossTenantRes = await request(app)
      .get(`/api/v1/templates/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${signupB.body.data.accessToken}`);
    expect(crossTenantRes.status).toBe(404);
  });
});

describe('HR automation — announcements', () => {
  it('lets everyone read an ALL-audience announcement but only managers publish it', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ title: 'Blocked', body: 'x', audience: 'ALL' });
    expect(forbiddenRes.status).toBe(403);

    const publishRes = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Office closed Friday', body: 'Enjoy the long weekend', audience: 'ALL' });
    expect(publishRes.status).toBe(201);

    const readRes = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.body.data).toHaveLength(1);
  });

  it('scopes a DEPARTMENT announcement to matching employees only', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const engineer = await createEmployeeAccount(me.body.data.tenant.id, domain, 'Engineering');
    const salesRep = await createEmployeeAccount(me.body.data.tenant.id, domain, 'Sales');

    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Eng standup moved', body: 'Now at 10am', audience: 'DEPARTMENT', department: 'Engineering' });

    const engineerView = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${engineer.token}`);
    expect(engineerView.body.data).toHaveLength(1);

    const salesView = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${salesRep.token}`);
    expect(salesView.body.data).toHaveLength(0);
  });

  it('rejects a DEPARTMENT announcement with no department specified', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Missing dept', body: 'x', audience: 'DEPARTMENT' });
    expect(res.status).toBe(400);
  });

  it('excludes an expired announcement from the visible list', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Old news', body: 'x', audience: 'ALL', expiresAt: '2020-01-01T00:00:00.000Z' });

    const readRes = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.body.data).toHaveLength(0);
  });
});
