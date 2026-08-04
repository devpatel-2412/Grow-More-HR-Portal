import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketService, canTransitionTicket } from './ticket.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { notificationService } from '../notifications/notification.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../notifications/notification.service.js', () => ({ notificationService: { notify: vi.fn().mockResolvedValue(undefined) } }));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeTicket(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tick-1',
    tenantId: 'tenant-1',
    employeeId: 'reporter-1',
    assignedToId: null,
    status: 'OPEN',
    ...overrides,
  };
}

function makeDeps() {
  const repository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(makeTicket()),
    findWithComments: vi.fn(),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeTicket(), id, ...data })),
    findMany: vi.fn(),
  };
  const commentRepository = { create: vi.fn() };
  const employeeRepository = {
    findByUserId: vi.fn().mockResolvedValue({ id: 'reporter-1' }),
    findById: vi.fn().mockResolvedValue({ id: 'agent-1', tenantId: 'tenant-1', userId: 'user-agent-1' }),
  };
  return { repository, commentRepository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new TicketService(deps.repository as never, deps.commentRepository as never, deps.employeeRepository as never);
}

describe('canTransitionTicket', () => {
  it('walks forward one stage at a time', () => {
    expect(canTransitionTicket('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionTicket('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(canTransitionTicket('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('refuses to skip stages', () => {
    expect(canTransitionTicket('OPEN', 'RESOLVED')).toBe(false);
    expect(canTransitionTicket('OPEN', 'CLOSED')).toBe(false);
  });

  it('allows reopening from RESOLVED or CLOSED back to OPEN', () => {
    expect(canTransitionTicket('RESOLVED', 'OPEN')).toBe(true);
    expect(canTransitionTicket('CLOSED', 'OPEN')).toBe(true);
  });

  it('does not allow any other backward move', () => {
    expect(canTransitionTicket('IN_PROGRESS', 'OPEN')).toBe(false);
    expect(canTransitionTicket('CLOSED', 'RESOLVED')).toBe(false);
  });
});

describe('TicketService.changeStatus — ownership vs. TICKET_MANAGE', () => {
  it('lets the assigned agent move the ticket forward without TICKET_MANAGE', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ assignedToId: 'reporter-1' }));

    await build(deps).changeStatus('tenant-1', 'user-1', false, 'tick-1', 'IN_PROGRESS', {});

    expect(deps.repository.update).toHaveBeenCalledWith('tick-1', { status: 'IN_PROGRESS' });
  });

  it('blocks an unrelated employee from advancing the ticket', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ employeeId: 'someone-else', assignedToId: 'someone-else' }));

    await expect(build(deps).changeStatus('tenant-1', 'user-1', false, 'tick-1', 'IN_PROGRESS', {})).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('lets the original reporter reopen their own resolved ticket without TICKET_MANAGE', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ status: 'RESOLVED', employeeId: 'reporter-1' }));

    await build(deps).changeStatus('tenant-1', 'user-1', false, 'tick-1', 'OPEN', {});

    expect(deps.repository.update).toHaveBeenCalledWith('tick-1', { status: 'OPEN' });
  });

  it('blocks the reporter from advancing a ticket they did not resolve (only reopening is theirs)', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ status: 'OPEN', employeeId: 'reporter-1' }));

    await expect(build(deps).changeStatus('tenant-1', 'user-1', false, 'tick-1', 'IN_PROGRESS', {})).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('rejects an illegal transition even for a TICKET_MANAGE holder', async () => {
    const deps = makeDeps();
    await expect(build(deps).changeStatus('tenant-1', 'user-1', true, 'tick-1', 'RESOLVED', {})).rejects.toThrow(
      ConflictError,
    );
  });
});

describe('TicketService.assign', () => {
  it('notifies the newly assigned agent', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ subject: 'Laptop broken', assignedToId: null }));

    await build(deps).assign('tenant-1', 'tick-1', 'agent-1', {});

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-agent-1', type: 'TICKET_ASSIGNED', link: '/helpdesk/tick-1' }),
    );
  });

  it('does not notify when the ticket is unassigned (assignedToId: null)', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ assignedToId: 'agent-1' }));

    await build(deps).assign('tenant-1', 'tick-1', null, {});

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('does not re-notify when re-assigning to the same agent', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ assignedToId: 'agent-1' }));

    await build(deps).assign('tenant-1', 'tick-1', 'agent-1', {});

    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('404s when assigning to an employee outside the tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'agent-1', tenantId: 'other-tenant', userId: 'user-agent-1' });

    await expect(build(deps).assign('tenant-1', 'tick-1', 'agent-1', {})).rejects.toThrow(NotFoundError);
    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});

describe('TicketService.addComment', () => {
  it("blocks a bystander from commenting on someone else's ticket", async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ employeeId: 'someone-else', assignedToId: null }));
    deps.employeeRepository.findByUserId.mockResolvedValue({ id: 'bystander-1' });

    await expect(build(deps).addComment('tenant-1', 'user-1', false, 'tick-1', 'hello', {})).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('allows the reporter to comment on their own ticket', async () => {
    const deps = makeDeps();
    await build(deps).addComment('tenant-1', 'user-1', false, 'tick-1', 'hello', {});
    expect(deps.commentRepository.create).toHaveBeenCalled();
  });

  it('404s a ticket from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeTicket({ tenantId: 'other' }));
    await expect(build(deps).addComment('tenant-1', 'user-1', true, 'tick-1', 'hello', {})).rejects.toThrow(NotFoundError);
  });
});
