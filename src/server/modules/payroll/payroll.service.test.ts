import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollService } from './payroll.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
const { notify } = vi.hoisted(() => ({ notify: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../notifications/notification.service.js', () => ({ notificationService: { notify } }));

beforeEach(() => {
  notify.mockClear();
});

function makeRun(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'run-1', tenantId: 'tenant-1', month: 8, year: 2026, status: 'APPROVED', ...overrides };
}

function makeDeps() {
  const runRepository = {
    findById: vi.fn().mockResolvedValue(makeRun()),
    setStatus: vi.fn().mockImplementation((id, status) => Promise.resolve(makeRun({ id, status }))),
  };
  const itemRepository = {
    findEmployeeUserIdsForRun: vi.fn().mockResolvedValue([{ employee: { userId: 'user-1' } }, { employee: { userId: 'user-2' } }]),
  };
  return { runRepository, itemRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new PayrollService(undefined as never, deps.runRepository as never, deps.itemRepository as never, undefined as never, undefined as never);
}

describe('PayrollService.transitionRun', () => {
  it('notifies every employee with an item in the run once it moves to PAID', async () => {
    const deps = makeDeps();
    await build(deps).transitionRun('tenant-1', 'actor-1', 'run-1', 'PAID', {});

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', type: 'PAYSLIP_AVAILABLE' }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-2', type: 'PAYSLIP_AVAILABLE' }));
  });

  it('does not notify anyone when moving to a non-PAID status', async () => {
    const deps = makeDeps();
    await build(deps).transitionRun('tenant-1', 'actor-1', 'run-1', 'CANCELLED', {});
    expect(notify).not.toHaveBeenCalled();
  });

  it('still succeeds even if fetching notification recipients fails', async () => {
    const deps = makeDeps();
    deps.itemRepository.findEmployeeUserIdsForRun.mockRejectedValueOnce(new Error('db down'));
    await expect(build(deps).transitionRun('tenant-1', 'actor-1', 'run-1', 'PAID', {})).resolves.toBeDefined();
  });
});
