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
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.branch.deleteMany();
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
      designation: 'Staff',
      dateOfJoining: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return { userId: user.id, token: login.body.data.accessToken as string, employeeId: profile.id };
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

describe('RBAC — route protection', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/rbac/roles');
    expect(res.status).toBe(401);
  });

  it('rejects a plain EMPLOYEE, who has no ROLE_MANAGE permission', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const res = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${worker.token}`);
    expect(res.status).toBe(403);
  });
});

describe('RBAC — role CRUD', () => {
  it('seeds nothing automatically, then lets ADMIN create/read/update/delete a custom role', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const listRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(0);

    const createRes = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team Lead', description: 'Leads a small team', permissions: ['employee:read:tenant'] });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.permissions).toHaveLength(1);
    const roleId = createRes.body.data.id;

    const duplicateNameRes = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Team Lead', permissions: [] });
    expect(duplicateNameRes.status).toBe(409);

    const getRes = await request(app).get(`/api/v1/rbac/roles/${roleId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Team Lead');

    const updateRes = await request(app)
      .patch(`/api/v1/rbac/roles/${roleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated description' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe('Updated description');

    const deleteRes = await request(app).delete(`/api/v1/rbac/roles/${roleId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(204);

    const listAfterDeleteRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${adminToken}`);
    expect(listAfterDeleteRes.body.data).toHaveLength(0);
  });

  it('blocks deleting a system role but allows deleting a custom one', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);

    const systemRole = await prisma.role.create({
      data: { tenantId: me.body.data.tenant.id, name: 'SEED_TEST', isSystem: true },
    });

    const deleteRes = await request(app).delete(`/api/v1/rbac/roles/${systemRole.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(409);
  });

  it('duplicates a role including its permissions', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Original', permissions: ['employee:read:tenant', 'employee:create'] });
    const roleId = createRes.body.data.id;

    const duplicateRes = await request(app)
      .post(`/api/v1/rbac/roles/${roleId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Clone' });
    expect(duplicateRes.status).toBe(201);
    expect(duplicateRes.body.data.name).toBe('Clone');
    expect(duplicateRes.body.data.permissions).toHaveLength(2);
  });
});

describe('RBAC — permission assignment', () => {
  it('assigns and removes a permission on a role', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Growable', permissions: [] });
    const roleId = createRes.body.data.id;

    const assignRes = await request(app)
      .post(`/api/v1/rbac/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permission: 'employee:read:tenant' });
    expect(assignRes.status).toBe(204);

    const afterAssignRes = await request(app).get(`/api/v1/rbac/roles/${roleId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(afterAssignRes.body.data.permissions.map((p: { permission: string }) => p.permission)).toContain('employee:read:tenant');

    const removeRes = await request(app)
      .delete(`/api/v1/rbac/roles/${roleId}/permissions/${encodeURIComponent('employee:read:tenant')}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removeRes.status).toBe(204);

    const afterRemoveRes = await request(app).get(`/api/v1/rbac/roles/${roleId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(afterRemoveRes.body.data.permissions).toHaveLength(0);
  });

  it('blocks an ADMIN from creating a role with a permission only SUPER_ADMIN holds (privilege escalation)', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    // ADMIN's static permission set (see ROLE_PERMISSIONS) deliberately excludes TENANT_LIST_ALL —
    // that's SUPER_ADMIN-only ("list every tenant"). ADMIN must not be able to grant it to anyone.
    const res = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Overreaching Role', permissions: ['tenant:list:all'] });
    expect(res.status).toBe(403);
  });

  it('blocks an ADMIN from assigning a permission they do not hold to an existing role', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const createRes = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Plain Role', permissions: [] });
    const roleId = createRes.body.data.id;

    const res = await request(app)
      .post(`/api/v1/rbac/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permission: 'tenant:list:all' });
    expect(res.status).toBe(403);
  });
});

describe('RBAC — dynamic role assignment actually grants access', () => {
  it('grants a static-EMPLOYEE user access to an ADMIN-only route once assigned a role carrying that permission', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    // Confirm the baseline: a plain EMPLOYEE cannot list tenant users (USER_READ_TENANT).
    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const roleRes = await request(app)
      .post('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'User Viewer', permissions: ['user:read:tenant'] });
    const roleId = roleRes.body.data.id;

    const assignRes = await request(app)
      .post(`/api/v1/rbac/users/${worker.userId}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roleId });
    expect(assignRes.status).toBe(201);

    // Same worker, same static EMPLOYEE role, now genuinely gains access via the dynamic grant.
    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);

    const removeRes = await request(app)
      .delete(`/api/v1/rbac/users/${worker.userId}/roles/${roleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removeRes.status).toBe(204);

    const afterRemoveRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRemoveRes.status).toBe(403);
  });
});

describe('RBAC — department and branch permissions', () => {
  it('grants access to every user in a department via a DepartmentPermission', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain, 'Finance');

    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/rbac/department-permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ department: 'Finance', permission: 'user:read:tenant' });
    expect(createRes.status).toBe(201);

    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);
  });

  it('grants access to every user in a branch via a BranchPermission', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const tenantId = me.body.data.tenant.id;
    const worker = await createEmployeeAccount(tenantId, domain);

    const branchRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Headquarters', code: 'HQ' });
    const branchId = branchRes.body.data.id;
    await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchId });

    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/rbac/branch-permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchId, permission: 'user:read:tenant' });
    expect(createRes.status).toBe(201);

    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);
  });

  it('rejects a branch permission for a branch that does not exist', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/rbac/branch-permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchId: '00000000-0000-0000-0000-000000000000', permission: 'user:read:tenant' });
    expect(res.status).toBe(404);
  });
});
