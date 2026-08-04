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
  await prisma.clientContact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.clientPortal.deleteMany();
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

describe('Helpdesk tickets', () => {
  it('walks a ticket through the full lifecycle with the ownership-vs-permission rule', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const reporter = await createEmployeeAccount(tenantId, domain);
    const agent = await createEmployeeAccount(tenantId, domain);

    const createRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({ category: 'IT', subject: 'Laptop wont boot', description: 'Blue screen on startup' });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.data.id;

    // A bystander with no tenant-wide read cannot even see the ticket.
    const bystander = await createEmployeeAccount(tenantId, domain);
    const peekRes = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', `Bearer ${bystander.token}`);
    expect(peekRes.status).toBe(403);

    // Assign requires TICKET_MANAGE.
    const assignRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: agent.employeeId });
    expect(assignRes.status).toBe(200);

    // Skipping straight to RESOLVED is rejected.
    const skipRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ status: 'RESOLVED' });
    expect(skipRes.status).toBe(409);

    // The assigned agent can move it forward without TICKET_MANAGE.
    const progressRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(progressRes.status).toBe(200);

    const resolveRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agent.token}`)
      .send({ status: 'RESOLVED' });
    expect(resolveRes.status).toBe(200);

    // A bystander cannot reopen it.
    const bystanderReopenRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${bystander.token}`)
      .send({ status: 'OPEN' });
    expect(bystanderReopenRes.status).toBe(403);

    // But the original reporter can reopen their own resolved ticket.
    const reopenRes = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({ status: 'OPEN' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.status).toBe('OPEN');

    // Reporter can comment on their own ticket.
    const commentRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${reporter.token}`)
      .send({ body: 'Still happening after restart' });
    expect(commentRes.status).toBe(201);

    const detailRes = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', `Bearer ${reporter.token}`);
    expect(detailRes.body.data.comments).toHaveLength(1);
  });
});

describe('Knowledge base', () => {
  it('lets any employee read but only KB_MANAGE holders write', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/kb-articles')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ title: 'Blocked', category: 'HR', content: 'x' });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/kb-articles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'How to expense a trip', category: 'Finance', content: 'Fill out the form' });
    expect(createRes.status).toBe(201);

    const readRes = await request(app).get('/api/v1/kb-articles').set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data).toHaveLength(1);
  });
});

describe('Documents', () => {
  it('lets any employee read but only DOCUMENT_MANAGE holders upload or delete', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ name: 'Policy.pdf', fileUrl: 'https://files.example.com/policy.pdf' });
    expect(forbiddenRes.status).toBe(403);

    const uploadRes = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Policy.pdf', folderPath: '/hr', fileUrl: 'https://files.example.com/policy.pdf' });
    expect(uploadRes.status).toBe(201);

    const readRes = await request(app).get('/api/v1/documents').set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.body.data).toHaveLength(1);
  });

  it('replaces a file as a new version, then archives and restores the document', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const uploadRes = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Handbook.pdf', category: 'HR', folderPath: '/hr', fileUrl: 'https://files.example.com/handbook-v1.pdf' });
    const documentId = uploadRes.body.data.id;
    expect(uploadRes.body.data.version).toBe(1);

    // A plain employee cannot replace the file.
    const forbiddenReplace = await request(app)
      .post(`/api/v1/documents/${documentId}/replace`)
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ fileUrl: 'https://files.example.com/handbook-sneaky.pdf' });
    expect(forbiddenReplace.status).toBe(403);

    const replaceRes = await request(app)
      .post(`/api/v1/documents/${documentId}/replace`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileUrl: 'https://files.example.com/handbook-v2.pdf' });
    expect(replaceRes.status).toBe(200);
    expect(replaceRes.body.data.version).toBe(2);
    expect(replaceRes.body.data.fileUrl).toBe('https://files.example.com/handbook-v2.pdf');

    // Full version history is preserved, most recent first.
    const versionsRes = await request(app)
      .get(`/api/v1/documents/${documentId}/versions`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(versionsRes.status).toBe(200);
    expect(versionsRes.body.data).toHaveLength(2);
    expect(versionsRes.body.data[0]).toMatchObject({ version: 2, fileUrl: 'https://files.example.com/handbook-v2.pdf' });
    expect(versionsRes.body.data[1]).toMatchObject({ version: 1, fileUrl: 'https://files.example.com/handbook-v1.pdf' });

    // Archiving removes it from the default list but it's still findable via ?archived=true.
    const archiveRes = await request(app)
      .post(`/api/v1/documents/${documentId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.archived).toBe(true);

    const activeListRes = await request(app).get('/api/v1/documents').set('Authorization', `Bearer ${worker.token}`);
    expect(activeListRes.body.data).toHaveLength(0);

    const archivedListRes = await request(app).get('/api/v1/documents?archived=true').set('Authorization', `Bearer ${worker.token}`);
    expect(archivedListRes.body.data).toHaveLength(1);

    // Archiving again is a conflict, not a silent no-op.
    const doubleArchiveRes = await request(app)
      .post(`/api/v1/documents/${documentId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(doubleArchiveRes.status).toBe(409);

    const restoreRes = await request(app)
      .post(`/api/v1/documents/${documentId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.archived).toBe(false);

    const restoredListRes = await request(app).get('/api/v1/documents').set('Authorization', `Bearer ${worker.token}`);
    expect(restoredListRes.body.data).toHaveLength(1);
  });
});

describe('Assets', () => {
  it('walks an asset through create → assign → repair → available, and scopes reads for an unprivileged caller', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const createRes = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'MacBook Pro', serialNumber: 'SN-100', type: 'LAPTOP' });
    expect(createRes.status).toBe(201);
    const assetId = createRes.body.data.id;

    const duplicateRes = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Another', serialNumber: 'SN-100', type: 'LAPTOP' });
    expect(duplicateRes.status).toBe(409);

    const assignRes = await request(app)
      .patch(`/api/v1/assets/${assetId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.status).toBe('ASSIGNED');

    // An unprivileged worker's list is scoped to their own assigned assets.
    const ownListRes = await request(app).get('/api/v1/assets').set('Authorization', `Bearer ${worker.token}`);
    expect(ownListRes.body.data).toHaveLength(1);
    expect(ownListRes.body.data[0].id).toBe(assetId);

    // Cannot assign it again while already assigned.
    const doubleAssignRes = await request(app)
      .patch(`/api/v1/assets/${assetId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: worker.employeeId });
    expect(doubleAssignRes.status).toBe(409);

    // Moving it into repair clears the assignment.
    const repairRes = await request(app)
      .patch(`/api/v1/assets/${assetId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNDER_REPAIR' });
    expect(repairRes.status).toBe(200);
    expect(repairRes.body.data.employeeId).toBeNull();

    const afterRepairListRes = await request(app).get('/api/v1/assets').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRepairListRes.body.data).toHaveLength(0);
  });
});

describe('Visitors', () => {
  it('registers, checks in, and checks out a visitor in order', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const host = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const registerRes = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Vic Visitor',
        email: 'vic@example.com',
        phone: '555-0100',
        hostEmployeeId: host.employeeId,
        purpose: 'Interview',
        expectedAt: '2026-08-01T10:00:00.000Z',
      });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.status).toBe('EXPECTED');
    const visitorId = registerRes.body.data.id;

    const checkOutTooSoonRes = await request(app)
      .post(`/api/v1/visitors/${visitorId}/check-out`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkOutTooSoonRes.status).toBe(409);

    const checkInRes = await request(app)
      .post(`/api/v1/visitors/${visitorId}/check-in`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.data.status).toBe('CHECKED_IN');

    const checkOutRes = await request(app)
      .post(`/api/v1/visitors/${visitorId}/check-out`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.data.status).toBe('CHECKED_OUT');
  });

  it('blocks a plain employee from the front-desk endpoints', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const res = await request(app)
      .post('/api/v1/visitors')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({
        name: 'Vic',
        email: 'vic2@example.com',
        phone: '555',
        hostEmployeeId: worker.employeeId,
        purpose: 'x',
        expectedAt: '2026-08-01T10:00:00.000Z',
      });
    expect(res.status).toBe(403);
  });
});

describe('Room bookings', () => {
  it('lets any employee book a free room and blocks an overlapping booking', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const employeeA = await createEmployeeAccount(me.body.data.tenant.id, domain);
    const employeeB = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const bookRes = await request(app)
      .post('/api/v1/room-bookings')
      .set('Authorization', `Bearer ${employeeA.token}`)
      .send({ roomName: 'Falcon', startTime: '2026-08-01T10:00:00.000Z', endTime: '2026-08-01T11:00:00.000Z', purpose: 'Standup' });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.data.id;

    const overlapRes = await request(app)
      .post('/api/v1/room-bookings')
      .set('Authorization', `Bearer ${employeeB.token}`)
      .send({ roomName: 'Falcon', startTime: '2026-08-01T10:30:00.000Z', endTime: '2026-08-01T11:30:00.000Z', purpose: 'Sync' });
    expect(overlapRes.status).toBe(409);

    // Back-to-back is fine.
    const adjacentRes = await request(app)
      .post('/api/v1/room-bookings')
      .set('Authorization', `Bearer ${employeeB.token}`)
      .send({ roomName: 'Falcon', startTime: '2026-08-01T11:00:00.000Z', endTime: '2026-08-01T12:00:00.000Z', purpose: 'Sync' });
    expect(adjacentRes.status).toBe(201);

    // employeeB cannot cancel employeeA's booking.
    const forbiddenCancelRes = await request(app)
      .post(`/api/v1/room-bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${employeeB.token}`);
    expect(forbiddenCancelRes.status).toBe(403);

    // employeeA can cancel their own.
    const cancelRes = await request(app)
      .post(`/api/v1/room-bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${employeeA.token}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // Cancelling frees the slot for a new booking.
    const rebookRes = await request(app)
      .post('/api/v1/room-bookings')
      .set('Authorization', `Bearer ${employeeB.token}`)
      .send({ roomName: 'Falcon', startTime: '2026-08-01T10:00:00.000Z', endTime: '2026-08-01T11:00:00.000Z', purpose: 'Retro' });
    expect(rebookRes.status).toBe(201);
  });
});
