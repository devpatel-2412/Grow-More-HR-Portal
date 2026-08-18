import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollService } from './payroll.service.js';

const employeeFindMany = vi.fn();
const leaveFindMany = vi.fn();

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    employeeProfile: { findMany: (...args: unknown[]) => employeeFindMany(...args) },
    leaveRequest: { findMany: (...args: unknown[]) => leaveFindMany(...args) },
  },
}));
vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

const TENANT = {
  id: 'tenant-1',
  payrollPfEmployeeRate: 0.12,
  payrollPfWageCeiling: 15000,
  payrollEsicEmployeeRate: 0.0075,
  payrollEsicWageCeiling: 21000,
  payrollProfessionalTax: 200,
  payrollTdsRate: 0,
  payrollOvertimeMultiplier: 1.5,
  payrollWorkingDaysPerMonth: 26,
};

function makeDeps() {
  const structureRepository = {
    findEffectiveForTenant: vi.fn().mockResolvedValue([]),
    findEffective: vi.fn(),
  };
  const runRepository = {
    findByPeriod: vi.fn().mockResolvedValue(null),
    createWithItems: vi.fn().mockImplementation((run, items) => Promise.resolve({ id: 'run-1', ...run, items })),
  };
  const itemRepository = {};
  const employeeRepository = {};
  const tenantRepository = { findById: vi.fn().mockResolvedValue(TENANT) };
  return { structureRepository, runRepository, itemRepository, employeeRepository, tenantRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new PayrollService(
    deps.structureRepository as never,
    deps.runRepository as never,
    deps.itemRepository as never,
    deps.employeeRepository as never,
    deps.tenantRepository as never,
  );
}

function structure(overrides: Partial<Record<string, unknown>> = {}) {
  return { employeeId: 'emp-1', basicSalary: 20000, hra: 8000, allowance: 2000, effectiveFrom: new Date('2026-01-01'), ...overrides };
}

describe('PayrollService.generateRun — salary structure selection (N+1 fix)', () => {
  beforeEach(() => {
    employeeFindMany.mockReset();
    leaveFindMany.mockResolvedValue([]);
  });

  it('fetches every employee\'s effective structure with a single tenant-wide query, not one call per employee', async () => {
    const deps = makeDeps();
    employeeFindMany.mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }, { id: 'emp-3' }]);
    deps.structureRepository.findEffectiveForTenant.mockResolvedValue([
      structure({ employeeId: 'emp-1' }),
      structure({ employeeId: 'emp-2' }),
      structure({ employeeId: 'emp-3' }),
    ]);

    await build(deps).generateRun('tenant-1', 3, 2026, {});

    expect(deps.structureRepository.findEffectiveForTenant).toHaveBeenCalledOnce();
    expect(deps.structureRepository.findEffective).not.toHaveBeenCalled();
  });

  it('picks each employee\'s most recent effective structure when several exist, not an older one', async () => {
    const deps = makeDeps();
    employeeFindMany.mockResolvedValue([{ id: 'emp-1' }]);
    // findEffectiveForTenant is documented to return rows ordered effectiveFrom desc — the older
    // raise (basicSalary 20000) must not win over the more recent one (basicSalary 30000).
    deps.structureRepository.findEffectiveForTenant.mockResolvedValue([
      structure({ employeeId: 'emp-1', basicSalary: 30000, effectiveFrom: new Date('2026-02-01') }),
      structure({ employeeId: 'emp-1', basicSalary: 20000, effectiveFrom: new Date('2025-01-01') }),
    ]);

    const run = await build(deps).generateRun('tenant-1', 3, 2026, {});

    expect(run.items).toHaveLength(1);
    expect(run.items[0].grossSalary).toBeGreaterThan(30000); // basic 30000 + hra 8000 + allowance 2000
  });

  it('skips an employee with no effective structure instead of defaulting to zero pay', async () => {
    const deps = makeDeps();
    employeeFindMany.mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-no-structure' }]);
    deps.structureRepository.findEffectiveForTenant.mockResolvedValue([structure({ employeeId: 'emp-1' })]);

    const run = await build(deps).generateRun('tenant-1', 3, 2026, {});

    expect(run.items).toHaveLength(1);
    expect(run.items[0].employeeId).toBe('emp-1');
  });

  it('rejects when no active employee has any effective structure', async () => {
    const deps = makeDeps();
    employeeFindMany.mockResolvedValue([{ id: 'emp-1' }]);
    deps.structureRepository.findEffectiveForTenant.mockResolvedValue([]);

    await expect(build(deps).generateRun('tenant-1', 3, 2026, {})).rejects.toThrow(/no employees have a salary structure/i);
  });
});
