import { describe, it, expect, vi } from 'vitest';
import { VisitorService } from './visitor.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeVisitor(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'vis-1', tenantId: 'tenant-1', status: 'EXPECTED', checkInTime: null, checkOutTime: null, ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeVisitor()),
    findById: vi.fn().mockResolvedValue(makeVisitor()),
    findByPassCode: vi.fn(),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeVisitor(), id, ...data })),
    findMany: vi.fn(),
  };
  const employeeRepository = { findById: vi.fn().mockResolvedValue({ id: 'host-1', tenantId: 'tenant-1' }) };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new VisitorService(deps.repository as never, deps.employeeRepository as never);
}

describe('VisitorService.register', () => {
  it('404s a host from another tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'host-1', tenantId: 'other' });
    await expect(
      build(deps).register(
        'tenant-1',
        { name: 'Vic', email: 'vic@ex.com', phone: '555', hostEmployeeId: 'host-1', purpose: 'Meeting', expectedAt: new Date() },
        {},
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('generates a unique pass code and starts EXPECTED', async () => {
    const deps = makeDeps();
    await build(deps).register(
      'tenant-1',
      { name: 'Vic', email: 'vic@ex.com', phone: '555', hostEmployeeId: 'host-1', purpose: 'Meeting', expectedAt: new Date() },
      {},
    );
    const created = deps.repository.create.mock.calls[0][0];
    expect(created.status).toBe('EXPECTED');
    expect(typeof created.qrPassCode).toBe('string');
    expect(created.qrPassCode.length).toBeGreaterThan(6);
  });
});

describe('VisitorService — check-in / check-out', () => {
  it('refuses to check in a visitor who is not EXPECTED', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeVisitor({ status: 'CHECKED_OUT' }));
    await expect(build(deps).checkIn('tenant-1', 'vis-1', {})).rejects.toThrow(ConflictError);
  });

  it('checks in an expected visitor and stamps the time', async () => {
    const deps = makeDeps();
    await build(deps).checkIn('tenant-1', 'vis-1', {});
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.status).toBe('CHECKED_IN');
    expect(data.checkInTime).toBeInstanceOf(Date);
  });

  it('refuses to check out a visitor who has not checked in', async () => {
    const deps = makeDeps();
    await expect(build(deps).checkOut('tenant-1', 'vis-1', {})).rejects.toThrow(ConflictError);
  });

  it('checks out a checked-in visitor', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeVisitor({ status: 'CHECKED_IN' }));
    await build(deps).checkOut('tenant-1', 'vis-1', {});
    const [, data] = deps.repository.update.mock.calls[0];
    expect(data.status).toBe('CHECKED_OUT');
    expect(data.checkOutTime).toBeInstanceOf(Date);
  });
});
