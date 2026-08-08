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
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.vendor.deleteMany();
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

describe('Vendors', () => {
  it('lets any employee read but only VENDOR_MANAGE holders write, and blocks deleting a vendor in use', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const forbiddenRes = await request(app)
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ name: 'Acme Supplies' });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Supplies', gstNumber: '27ABCDE1234F1Z5' });
    expect(createRes.status).toBe(201);
    const vendorId = createRes.body.data.id;

    const duplicateRes = await request(app)
      .post('/api/v1/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Supplies' });
    expect(duplicateRes.status).toBe(409);

    const readRes = await request(app).get('/api/v1/vendors').set('Authorization', `Bearer ${worker.token}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data).toHaveLength(1);

    const itemRes = await request(app)
      .post('/api/v1/inventory-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A4 Paper', sku: 'SKU-1', vendorId });

    const blockedDeleteRes = await request(app)
      .delete(`/api/v1/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDeleteRes.status).toBe(409);

    await request(app)
      .patch(`/api/v1/inventory-items/${itemRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ vendorId: null });

    const deleteRes = await request(app).delete(`/api/v1/vendors/${vendorId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);
  });
});

describe('Inventory items', () => {
  it('walks an item through create with opening stock → stock-in → stock-out → adjust, enforcing non-negative quantity', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const createRes = await request(app)
      .post('/api/v1/inventory-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A4 Paper', sku: 'SKU-1', unit: 'box', reorderLevel: 5, openingQuantity: 20 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.quantityOnHand).toBe(20);
    const itemId = createRes.body.data.id;

    const duplicateSkuRes = await request(app)
      .post('/api/v1/inventory-items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Other', sku: 'SKU-1' });
    expect(duplicateSkuRes.status).toBe(409);

    const stockInRes = await request(app)
      .post(`/api/v1/inventory-items/${itemId}/stock-in`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 10, reference: 'PO-100' });
    expect(stockInRes.status).toBe(200);
    expect(stockInRes.body.data.quantityOnHand).toBe(30);

    const overdrawRes = await request(app)
      .post(`/api/v1/inventory-items/${itemId}/stock-out`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 999 });
    expect(overdrawRes.status).toBe(409);

    const stockOutRes = await request(app)
      .post(`/api/v1/inventory-items/${itemId}/stock-out`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 12, reference: 'Issued to Ops' });
    expect(stockOutRes.status).toBe(200);
    expect(stockOutRes.body.data.quantityOnHand).toBe(18);

    const negativeAdjustRes = await request(app)
      .post(`/api/v1/inventory-items/${itemId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: -100 });
    expect(negativeAdjustRes.status).toBe(409);

    const adjustRes = await request(app)
      .post(`/api/v1/inventory-items/${itemId}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: -3, reference: 'Damaged stock' });
    expect(adjustRes.status).toBe(200);
    expect(adjustRes.body.data.quantityOnHand).toBe(15);

    const historyRes = await request(app)
      .get(`/api/v1/inventory-items/${itemId}/transactions`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.map((t: { type: string }) => t.type)).toEqual(['ADJUSTMENT', 'OUT', 'IN', 'IN']);

    // Deleting an item with transaction history is refused.
    const blockedDeleteRes = await request(app)
      .delete(`/api/v1/inventory-items/${itemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDeleteRes.status).toBe(409);
  });
});
