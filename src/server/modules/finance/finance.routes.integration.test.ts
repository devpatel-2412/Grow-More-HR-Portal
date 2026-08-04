/**
 * Full HTTP integration tests against the real Express app + a real Postgres database.
 * See auth.routes.integration.test.ts's header comment for setup commands — same requirements.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../db/prisma.js';

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

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase();
});

describe('Finance — documents and payments', () => {
  it('creates an invoice, computes totals, and walks it through send → pay', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INVOICE',
        issueDate: '2026-07-01',
        dueDate: '2026-07-15',
        taxRate: 10,
        lineItems: [
          { description: 'Design work', quantity: 10, unitPrice: 100 },
          { description: 'Development', quantity: 5, unitPrice: 200 },
        ],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.number).toBe('INV-2026-0001');
    expect(createRes.body.data.subtotal).toBe(2000);
    expect(createRes.body.data.taxAmount).toBe(200);
    expect(createRes.body.data.totalAmount).toBe(2200);
    expect(createRes.body.data.status).toBe('DRAFT');
    const docId = createRes.body.data.id;

    // Payment on a draft is rejected — nothing has been issued yet.
    const earlyPayRes = await request(app)
      .post(`/api/v1/finance/${docId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 100, paidAt: '2026-07-02', method: 'bank' });
    expect(earlyPayRes.status).toBe(409);

    const sendRes = await request(app).post(`/api/v1/finance/${docId}/send`).set('Authorization', `Bearer ${adminToken}`);
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.status).toBe('SENT');

    // Editing a sent document is rejected.
    const lateEditRes = await request(app)
      .patch(`/api/v1/finance/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'too late' });
    expect(lateEditRes.status).toBe(409);

    // Partial payment keeps it SENT.
    const partialRes = await request(app)
      .post(`/api/v1/finance/${docId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1200, paidAt: '2026-07-05', method: 'bank', reference: 'TXN-1' });
    expect(partialRes.status).toBe(201);
    expect(partialRes.body.data.amountPaid).toBe(1200);
    expect(partialRes.body.data.status).toBe('SENT');

    // Overpaying beyond the remaining balance is rejected.
    const overpayRes = await request(app)
      .post(`/api/v1/finance/${docId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 5000, paidAt: '2026-07-06', method: 'bank' });
    expect(overpayRes.status).toBe(400);

    // The remaining balance flips it to PAID.
    const finalRes = await request(app)
      .post(`/api/v1/finance/${docId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1000, paidAt: '2026-07-10', method: 'bank' });
    expect(finalRes.status).toBe(201);
    expect(finalRes.body.data.amountPaid).toBe(2200);
    expect(finalRes.body.data.status).toBe('PAID');

    const detailRes = await request(app).get(`/api/v1/finance/${docId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detailRes.body.data.payments).toHaveLength(2);
    expect(detailRes.body.data.lineItems).toHaveLength(2);

    // PAID is terminal.
    const voidRes = await request(app).post(`/api/v1/finance/${docId}/void`).set('Authorization', `Bearer ${adminToken}`);
    expect(voidRes.status).toBe(409);
  });

  it('numbers documents sequentially per type, not globally', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    async function create(type: string) {
      return request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type, issueDate: '2026-07-01', taxRate: 0, lineItems: [{ description: 'Item', quantity: 1, unitPrice: 10 }] });
    }

    const inv1 = await create('INVOICE');
    const quo1 = await create('QUOTATION');
    const inv2 = await create('INVOICE');

    expect(inv1.body.data.number).toBe('INV-2026-0001');
    expect(quo1.body.data.number).toBe('QUO-2026-0001');
    expect(inv2.body.data.number).toBe('INV-2026-0002');
  });

  it('recalculates totals when line items are edited on a draft', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'QUOTATION', issueDate: '2026-07-01', taxRate: 0, lineItems: [{ description: 'A', quantity: 1, unitPrice: 100 }] });
    const docId = createRes.body.data.id;

    const editRes = await request(app)
      .patch(`/api/v1/finance/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lineItems: [{ description: 'B', quantity: 3, unitPrice: 50 }], taxRate: 10 });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.subtotal).toBe(150);
    expect(editRes.body.data.taxAmount).toBe(15);
    expect(editRes.body.data.totalAmount).toBe(165);
  });

  it('rejects an invoice with no line items', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'INVOICE', issueDate: '2026-07-01', lineItems: [] });
    expect(res.status).toBe(400);
  });

  it('isolates tenants and blocks a plain employee from managing finance', async () => {
    const { res: signupA } = await signupTenant();
    const tokenA = signupA.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'INVOICE', issueDate: '2026-07-01', taxRate: 0, lineItems: [{ description: 'A', quantity: 1, unitPrice: 10 }] });

    const { res: signupB } = await signupTenant();
    const crossTenantRes = await request(app)
      .get(`/api/v1/finance/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${signupB.body.data.accessToken}`);
    expect(crossTenantRes.status).toBe(404);
  });
});

describe('Finance — GST split', () => {
  it('leaves tax unsplit until both the tenant GSTIN state and the document place of supply are set', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;

    const noGstRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INVOICE',
        issueDate: '2026-07-01',
        taxRate: 18,
        placeOfSupplyStateCode: '27',
        lineItems: [{ description: 'Work', quantity: 1, unitPrice: 1000, hsnCode: '9983' }],
      });
    expect(noGstRes.status).toBe(201);
    expect(noGstRes.body.data.cgstAmount).toBe(0);
    expect(noGstRes.body.data.sgstAmount).toBe(0);
    expect(noGstRes.body.data.igstAmount).toBe(0);
    expect(noGstRes.body.data.taxAmount).toBe(180);

    await request(app)
      .patch(`/api/v1/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ gstin: '27ABCDE1234F1Z5', gstStateCode: '27' });

    const sameStateRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INVOICE',
        issueDate: '2026-07-01',
        taxRate: 18,
        placeOfSupplyStateCode: '27',
        lineItems: [{ description: 'Work', quantity: 1, unitPrice: 1000 }],
      });
    expect(sameStateRes.status).toBe(201);
    expect(sameStateRes.body.data.cgstAmount).toBe(90);
    expect(sameStateRes.body.data.sgstAmount).toBe(90);
    expect(sameStateRes.body.data.igstAmount).toBe(0);

    const crossStateRes = await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INVOICE',
        issueDate: '2026-07-01',
        taxRate: 18,
        placeOfSupplyStateCode: '09',
        lineItems: [{ description: 'Work', quantity: 1, unitPrice: 1000 }],
      });
    expect(crossStateRes.status).toBe(201);
    expect(crossStateRes.body.data.cgstAmount).toBe(0);
    expect(crossStateRes.body.data.sgstAmount).toBe(0);
    expect(crossStateRes.body.data.igstAmount).toBe(180);
  });
});

describe('Finance — Profit & Loss report', () => {
  it('recognizes invoices as revenue and expenses/bills as expenses within the date range', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    async function createAndSend(type: string, issueDate: string, unitPrice: number) {
      const createRes = await request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type, issueDate, taxRate: 0, lineItems: [{ description: 'x', quantity: 1, unitPrice }] });
      await request(app).post(`/api/v1/finance/${createRes.body.data.id}/send`).set('Authorization', `Bearer ${adminToken}`);
    }

    await createAndSend('INVOICE', '2026-01-15', 1000);
    await createAndSend('EXPENSE', '2026-01-20', 200);
    await createAndSend('BILL', '2026-02-05', 100);
    // Outside the report range — must not be counted.
    await createAndSend('INVOICE', '2026-03-01', 9999);
    // A draft is never a recognized transaction.
    await request(app)
      .post('/api/v1/finance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'INVOICE', issueDate: '2026-01-10', taxRate: 0, lineItems: [{ description: 'draft', quantity: 1, unitPrice: 5000 }] });

    const reportRes = await request(app)
      .get('/api/v1/finance/reports/profit-loss?from=2026-01-01&to=2026-02-28')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.revenue).toBe(1000);
    expect(reportRes.body.data.expenses).toBe(300);
    expect(reportRes.body.data.netProfit).toBe(700);
    expect(reportRes.body.data.byMonth).toEqual([
      { month: '2026-01', revenue: 1000, expenses: 200, netProfit: 800 },
      { month: '2026-02', revenue: 0, expenses: 100, netProfit: -100 },
    ]);
  });
});
