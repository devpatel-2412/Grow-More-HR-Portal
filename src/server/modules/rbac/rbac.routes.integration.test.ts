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
import { seedSystemRolesForTenant } from './rbac-seed.util.js';

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

async function signupTenant() {
  return signupTestTenant(app);
}

/**
 * signupTestTenant() always hands back an ADMIN (the shared fixture other integration test files
 * also rely on) — this router is now gated to SUPER_ADMIN only, so RBAC tests promote that account
 * and re-login, since the JWT's role claim is minted at login time and won't reflect a promotion
 * made after the fact.
 */
async function signupSuperAdminTenant() {
  const { res, domain, tenantId, userId } = await signupTestTenant(app);
  await prisma.user.update({ where: { id: userId }, data: { role: 'SUPER_ADMIN' } });
  const relogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: res.body.data.user.email, password: 'CorrectPassword123' });
  return { res: relogin, domain, tenantId, userId };
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

  it('rejects a plain EMPLOYEE', async () => {
    const { res: signupRes, domain } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const worker = await createEmployeeAccount(me.body.data.tenant.id, domain);

    const res = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${worker.token}`);
    expect(res.status).toBe(403);
  });

  it('rejects an ADMIN — this router is SUPER_ADMIN-only, not staff-admin', async () => {
    const { res: signupRes } = await signupTenant();
    const adminToken = signupRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

describe('RBAC — the 6 fixed roles', () => {
  it('lists exactly the 5 seeded system roles (SUPER_ADMIN itself has no DB row to list)', async () => {
    const { res: signupRes, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    await seedSystemRolesForTenant(tenantId);

    const listRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(5);
    expect(listRes.body.data.map((r: { name: string }) => r.name).sort()).toEqual(
      ['ADMIN', 'EMPLOYEE', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER'].sort(),
    );
  });

  it('has no route left to create, rename, or delete a role — only the 6 fixed roles can ever exist', async () => {
    const { res: signupRes, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    await seedSystemRolesForTenant(tenantId);
    const listRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${token}`);
    const roleId = listRes.body.data[0].id;

    const createRes = await request(app).post('/api/v1/rbac/roles').set('Authorization', `Bearer ${token}`).send({ name: 'New Role' });
    expect(createRes.status).toBe(404);

    const updateRes = await request(app)
      .patch(`/api/v1/rbac/roles/${roleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app).delete(`/api/v1/rbac/roles/${roleId}`).set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(404);

    const duplicateRes = await request(app)
      .post(`/api/v1/rbac/roles/${roleId}/duplicate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Clone' });
    expect(duplicateRes.status).toBe(404);
  });
});

describe('RBAC — permission assignment', () => {
  it("assigns and removes a permission on a fixed role — SUPER_ADMIN's own checkbox toggle", async () => {
    const { res: signupRes, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    await seedSystemRolesForTenant(tenantId);
    const listRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${token}`);
    const employeeRoleId = listRes.body.data.find((r: { name: string }) => r.name === 'EMPLOYEE').id;

    const assignRes = await request(app)
      .post(`/api/v1/rbac/roles/${employeeRoleId}/permissions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ permission: 'tenant:list:all' });
    expect(assignRes.status).toBe(204);

    const afterAssignRes = await request(app).get(`/api/v1/rbac/roles/${employeeRoleId}`).set('Authorization', `Bearer ${token}`);
    expect(afterAssignRes.body.data.permissions.map((p: { permission: string }) => p.permission)).toContain('tenant:list:all');

    const removeRes = await request(app)
      .delete(`/api/v1/rbac/roles/${employeeRoleId}/permissions/${encodeURIComponent('tenant:list:all')}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removeRes.status).toBe(204);

    const afterRemoveRes = await request(app).get(`/api/v1/rbac/roles/${employeeRoleId}`).set('Authorization', `Bearer ${token}`);
    expect(afterRemoveRes.body.data.permissions.map((p: { permission: string }) => p.permission)).not.toContain('tenant:list:all');
  });
});

describe('RBAC — enabling a permission for a role takes effect immediately for everyone holding it', () => {
  it('the Employee Portal example: EMPLOYEE gains USER_READ_TENANT the moment SUPER_ADMIN grants it — no re-login required', async () => {
    const { res: signupRes, domain, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    await seedSystemRolesForTenant(tenantId);
    const worker = await createEmployeeAccount(tenantId, domain);

    // Baseline: EMPLOYEE's seeded default does not include USER_READ_TENANT.
    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const listRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${token}`);
    const employeeRoleId = listRes.body.data.find((r: { name: string }) => r.name === 'EMPLOYEE').id;

    const assignRes = await request(app)
      .post(`/api/v1/rbac/roles/${employeeRoleId}/permissions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ permission: 'user:read:tenant' });
    expect(assignRes.status).toBe(204);

    // Same worker, same access token, no re-login — the grant lives on the role, not the user.
    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);

    const removeRes = await request(app)
      .delete(`/api/v1/rbac/roles/${employeeRoleId}/permissions/${encodeURIComponent('user:read:tenant')}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removeRes.status).toBe(204);

    const afterRemoveRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRemoveRes.status).toBe(403);
  });
});

describe('RBAC — user-role-assignment and department/branch permissions', () => {
  it('grants a static-EMPLOYEE user access to an ADMIN-only route once assigned the seeded ADMIN role', async () => {
    const { res: signupRes, domain, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    await seedSystemRolesForTenant(tenantId);
    const worker = await createEmployeeAccount(tenantId, domain);

    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const listRes = await request(app).get('/api/v1/rbac/roles').set('Authorization', `Bearer ${token}`);
    const adminRoleId = listRes.body.data.find((r: { name: string }) => r.name === 'ADMIN').id;

    const assignRes = await request(app)
      .post(`/api/v1/rbac/users/${worker.userId}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ roleId: adminRoleId });
    expect(assignRes.status).toBe(201);

    // Same worker, still statically EMPLOYEE, now gains access via the additive UserRoleAssignment.
    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);

    const removeRes = await request(app)
      .delete(`/api/v1/rbac/users/${worker.userId}/roles/${adminRoleId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removeRes.status).toBe(204);

    const afterRemoveRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRemoveRes.status).toBe(403);
  });

  it('grants access to every user in a department via a DepartmentPermission', async () => {
    const { res: signupRes, domain, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    const worker = await createEmployeeAccount(tenantId, domain, 'Finance');

    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/rbac/department-permissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ department: 'Finance', permission: 'user:read:tenant' });
    expect(createRes.status).toBe(201);

    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);
  });

  it('grants access to every user in a branch via a BranchPermission', async () => {
    const { res: signupRes, domain, tenantId } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;
    const worker = await createEmployeeAccount(tenantId, domain);

    const branchRes = await request(app)
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Headquarters', code: 'HQ' });
    const branchId = branchRes.body.data.id;
    await request(app)
      .patch(`/api/v1/employees/${worker.employeeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ branchId });

    const beforeRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(beforeRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/rbac/branch-permissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ branchId, permission: 'user:read:tenant' });
    expect(createRes.status).toBe(201);

    const afterRes = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${worker.token}`);
    expect(afterRes.status).toBe(200);
  });

  it('rejects a branch permission for a branch that does not exist', async () => {
    const { res: signupRes } = await signupSuperAdminTenant();
    const token = signupRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/rbac/branch-permissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ branchId: '00000000-0000-0000-0000-000000000000', permission: 'user:read:tenant' });
    expect(res.status).toBe(404);
  });
});
