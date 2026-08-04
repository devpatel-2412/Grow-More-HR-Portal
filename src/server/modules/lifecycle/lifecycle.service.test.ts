import { describe, it, expect, vi } from 'vitest';
import { LifecycleService } from './lifecycle.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeEmployee(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'emp-1',
    tenantId: 'tenant-1',
    status: 'ONBOARDING',
    designation: 'Engineer I',
    department: 'Engineering',
    branchId: null,
    teamId: null,
    managerId: null,
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    findEventsByEmployee: vi.fn(),
    recordEvent: vi.fn().mockImplementation((_tenantId, _employeeId, _event, profileUpdate) => ({
      updatedEmployee: { ...makeEmployee(), ...profileUpdate },
      lifecycleEvent: { id: 'event-1' },
    })),
  };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue(makeEmployee()),
  };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new LifecycleService(deps.repository as never, deps.employeeRepository as never);
}

describe('LifecycleService.confirm', () => {
  it('404s an employee from another tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ tenantId: 'other' }));
    await expect(build(deps).confirm('tenant-1', 'emp-1', { effectiveDate: new Date() }, {})).rejects.toThrow(NotFoundError);
  });

  it('refuses to confirm an employee who is not onboarding', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
    await expect(build(deps).confirm('tenant-1', 'emp-1', { effectiveDate: new Date() }, {})).rejects.toThrow(ConflictError);
  });

  it('confirms an onboarding employee to active', async () => {
    const deps = makeDeps();
    await build(deps).confirm('tenant-1', 'emp-1', { effectiveDate: new Date() }, {});
    const [, , event, profileUpdate] = deps.repository.recordEvent.mock.calls[0];
    expect(event.type).toBe('CONFIRMATION');
    expect(profileUpdate.status).toBe('ACTIVE');
  });
});

describe('LifecycleService.promote', () => {
  it('refuses to promote an employee who has already exited', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'TERMINATED' }));
    await expect(
      build(deps).promote('tenant-1', 'emp-1', { effectiveDate: new Date(), newDesignation: 'Engineer II' }, {}),
    ).rejects.toThrow(ConflictError);
  });

  it('records the previous and new designation', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
    await build(deps).promote('tenant-1', 'emp-1', { effectiveDate: new Date(), newDesignation: 'Engineer II' }, {});
    const [, , event, profileUpdate] = deps.repository.recordEvent.mock.calls[0];
    expect(event.type).toBe('PROMOTION');
    expect(JSON.parse(event.previousValue).designation).toBe('Engineer I');
    expect(JSON.parse(event.newValue).designation).toBe('Engineer II');
    expect(profileUpdate.designation).toBe('Engineer II');
  });
});

describe('LifecycleService.transfer', () => {
  it('refuses to transfer an employee who has already exited', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'RESIGNED' }));
    await expect(build(deps).transfer('tenant-1', 'emp-1', { effectiveDate: new Date(), branchId: 'branch-2' }, {})).rejects.toThrow(
      ConflictError,
    );
  });

  it('connects the new branch and disconnects when null', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
    await build(deps).transfer('tenant-1', 'emp-1', { effectiveDate: new Date(), branchId: 'branch-2', teamId: null }, {});
    const [, , , profileUpdate] = deps.repository.recordEvent.mock.calls[0];
    expect(profileUpdate.branch).toEqual({ connect: { id: 'branch-2' } });
    expect(profileUpdate.team).toEqual({ disconnect: true });
    expect(profileUpdate.manager).toBeUndefined();
  });
});

describe('LifecycleService.initiateExit', () => {
  it('refuses to initiate exit for a non-active employee', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ONBOARDING' }));
    await expect(build(deps).initiateExit('tenant-1', 'emp-1', { effectiveDate: new Date() }, {})).rejects.toThrow(ConflictError);
  });

  it('moves an active employee to offboarding', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
    await build(deps).initiateExit('tenant-1', 'emp-1', { effectiveDate: new Date() }, {});
    const [, , , profileUpdate] = deps.repository.recordEvent.mock.calls[0];
    expect(profileUpdate.status).toBe('OFFBOARDING');
  });
});

describe('LifecycleService.completeExit', () => {
  it('refuses to complete exit before it has been initiated', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'ACTIVE' }));
    await expect(
      build(deps).completeExit('tenant-1', 'emp-1', { effectiveDate: new Date(), outcome: 'RESIGNED' }, {}),
    ).rejects.toThrow(ConflictError);
  });

  it('sets the final status from the chosen outcome', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue(makeEmployee({ status: 'OFFBOARDING' }));
    await build(deps).completeExit('tenant-1', 'emp-1', { effectiveDate: new Date(), outcome: 'TERMINATED' }, {});
    const [, , , profileUpdate] = deps.repository.recordEvent.mock.calls[0];
    expect(profileUpdate.status).toBe('TERMINATED');
  });
});
