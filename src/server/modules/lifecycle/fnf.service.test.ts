import { describe, it, expect, vi } from 'vitest';
import { FnfService } from './fnf.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeEmployee(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'emp-1', tenantId: 'tenant-1', status: 'OFFBOARDING', ...overrides };
}

function makeSettlement(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'fnf-1', employeeId: 'emp-1', status: 'DRAFT', netPayable: 1000, ...overrides };
}

function makeDeps() {
  const repository = {
    findByEmployee: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => ({ ...makeSettlement(), ...data })),
    update: vi.fn().mockImplementation((employeeId, data) => ({ ...makeSettlement(), employeeId, ...data })),
  };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue(makeEmployee()),
  };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new FnfService(deps.repository as never, deps.employeeRepository as never);
}

const baseInput = { lastWorkingDay: new Date(), pendingSalary: 500, leaveEncashment: 300, bonus: 200, deductions: 100 };

describe('FnfService.create', () => {
  it('refuses to create a settlement for an active employee', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
    await expect(build(deps).create('tenant-1', 'emp-1', baseInput, {})).rejects.toThrow(ConflictError);
  });

  it('refuses a duplicate settlement', async () => {
    const deps = makeDeps();
    deps.repository.findByEmployee.mockResolvedValue(makeSettlement());
    await expect(build(deps).create('tenant-1', 'emp-1', baseInput, {})).rejects.toThrow(ConflictError);
  });

  it('computes net payable from the four components', async () => {
    const deps = makeDeps();
    const settlement = await build(deps).create('tenant-1', 'emp-1', baseInput, {});
    expect(settlement.netPayable).toBe(500 + 300 + 200 - 100);
  });
});

describe('FnfService.update', () => {
  it('404s when no settlement exists yet', async () => {
    const deps = makeDeps();
    await expect(build(deps).update('tenant-1', 'emp-1', baseInput, {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to edit a settlement that is no longer a draft', async () => {
    const deps = makeDeps();
    deps.repository.findByEmployee.mockResolvedValue(makeSettlement({ status: 'APPROVED' }));
    await expect(build(deps).update('tenant-1', 'emp-1', baseInput, {})).rejects.toThrow(ConflictError);
  });
});

describe('FnfService.changeStatus', () => {
  it('allows DRAFT to move to APPROVED', async () => {
    const deps = makeDeps();
    deps.repository.findByEmployee.mockResolvedValue(makeSettlement({ status: 'DRAFT' }));
    await expect(build(deps).changeStatus('tenant-1', 'emp-1', 'APPROVED', {})).resolves.toBeTruthy();
  });

  it('refuses to skip APPROVED and go straight to PAID', async () => {
    const deps = makeDeps();
    deps.repository.findByEmployee.mockResolvedValue(makeSettlement({ status: 'DRAFT' }));
    await expect(build(deps).changeStatus('tenant-1', 'emp-1', 'PAID', {})).rejects.toThrow(ConflictError);
  });

  it('treats PAID as terminal', async () => {
    const deps = makeDeps();
    deps.repository.findByEmployee.mockResolvedValue(makeSettlement({ status: 'PAID' }));
    await expect(build(deps).changeStatus('tenant-1', 'emp-1', 'APPROVED', {})).rejects.toThrow(ConflictError);
  });
});
