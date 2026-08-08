/**
 * Test-only fixture bootstrap — creates a fresh Tenant + ACTIVE ADMIN User + EmployeeProfile
 * directly via Prisma, then logs in through the real `POST /api/v1/auth/login` endpoint to get a
 * genuine access token, Set-Cookie header, and response body. This replicates exactly what the
 * now-removed public `POST /api/v1/auth/signup` endpoint used to hand back to callers (that
 * endpoint no longer exists — public registration is intentionally closed, every real user is
 * provisioned internally, see TenantService.create() and UserService.invite()), so every existing
 * integration test's `signupRes.status` / `.body.data.accessToken` / `.headers['set-cookie']`
 * usage keeps working unchanged — only each file's own `signupTenant()` wrapper needed to change.
 *
 * Going through the real login endpoint (rather than hand-rolling a fake response object) means
 * the cookie/JWT-issuing logic is never duplicated here — it's exercised for real, so this helper
 * can't drift from actual server behavior.
 */
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../db/prisma.js';
import { hashPassword } from '../utils/hash.util.js';

export function uniqueTestDomain(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export interface SignupTestTenantOverrides {
  tenantName?: string;
  tenantDomain?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export async function signupTestTenant(app: Express, overrides: SignupTestTenantOverrides = {}, userAgent?: string) {
  const domain = overrides.tenantDomain ?? uniqueTestDomain('acme');
  const password = overrides.password ?? 'CorrectPassword123';
  const email = (overrides.email ?? `admin-${domain}@acme.com`).toLowerCase();

  const tenant = await prisma.tenant.create({ data: { name: overrides.tenantName ?? 'Acme Inc', domain } });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });
  await prisma.employeeProfile.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      employeeId: `EMP-${new Date().getFullYear()}-${user.id.slice(0, 6).toUpperCase()}`,
      firstName: overrides.firstName ?? 'Ada',
      lastName: overrides.lastName ?? 'Admin',
      department: 'Executive',
      designation: 'Administrator',
      dateOfJoining: new Date(),
      status: 'ACTIVE',
    },
  });

  let req = request(app).post('/api/v1/auth/login').send({ email, password });
  if (userAgent) req = req.set('User-Agent', userAgent);
  const res = await req;

  return { res, domain, tenantId: tenant.id, userId: user.id };
}
