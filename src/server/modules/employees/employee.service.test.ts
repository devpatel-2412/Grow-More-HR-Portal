import { describe, it, expect, vi } from 'vitest';
import { EmployeeService } from './employee.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    userId: 'user-1',
    employeeId: 'EMP-01',
    firstName: 'Prem',
    lastName: 'Rami',
    department: 'Front-End',
    designation: 'JR.Front-End Developer',
    dateOfJoining: new Date('2026-07-09'),
    ...overrides,
  } as never;
}

function makeService(repositoryOverrides: Partial<Record<string, unknown>> = {}) {
  const repository = {
    findByUserId: vi.fn().mockResolvedValue(null),
    findByTenantAndEmployeeId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'emp-1' }),
    ...repositoryOverrides,
  };
  const userRepository = { findById: vi.fn().mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1' }) };
  return new EmployeeService(repository as never, userRepository as never);
}

describe('EmployeeService.create', () => {
  it('creates a profile when the user has none yet and the employee ID is free in this tenant', async () => {
    const service = makeService();
    await expect(service.create('tenant-1', makeInput())).resolves.toEqual({ id: 'emp-1' });
  });

  it('rejects with a clean ConflictError when the user already has a profile', async () => {
    const service = makeService({ findByUserId: vi.fn().mockResolvedValue({ id: 'existing-profile' }) });
    await expect(service.create('tenant-1', makeInput())).rejects.toMatchObject({
      statusCode: 409,
      message: 'This user already has an employee profile',
    });
  });

  // Regression test: EmployeeProfile.employeeId used to be globally unique across every tenant,
  // so two unrelated companies both wanting "EMP-01" would collide — the second create() call hit
  // a raw, unhandled Prisma unique-constraint violation and surfaced as a generic 500 "An
  // unexpected error occurred" instead of a clean, actionable message. employeeId is now unique
  // per tenant (see the tenant_employeeId_unique_per_tenant migration), and this check gives a
  // friendly ConflictError for a genuine same-tenant collision instead of relying on the DB error.
  it('rejects with a clean ConflictError when the employee ID is already taken within this tenant', async () => {
    const service = makeService({ findByTenantAndEmployeeId: vi.fn().mockResolvedValue({ id: 'other-employee' }) });
    await expect(service.create('tenant-1', makeInput())).rejects.toMatchObject({
      statusCode: 409,
      message: 'Employee ID "EMP-01" is already in use',
    });
  });
});
