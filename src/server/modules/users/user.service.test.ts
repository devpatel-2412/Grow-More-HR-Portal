import { describe, it, expect, vi } from 'vitest';
import { UserService } from './user.service.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));
vi.mock('../../shared/email/email.service.js', () => ({ emailService: { send: vi.fn().mockResolvedValue(undefined) } }));

function makeInvite(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'invite-1',
    tenantId: 'tenant-1',
    email: 'new@acme.com',
    role: 'EMPLOYEE',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

function makeDeps(inviteOverrides: Partial<Record<string, unknown>> = {}, clientProfileId: string | null = null) {
  const foundUser = { id: 'user-1', email: 'new@acme.com', clientProfileId };
  const repository = {
    findByEmail: vi.fn().mockResolvedValue(foundUser),
    update: vi.fn().mockImplementation((_id, data) => Promise.resolve({ ...foundUser, ...data })),
  };
  const inviteRepository = {
    findByTokenHash: vi.fn().mockResolvedValue(makeInvite(inviteOverrides)),
    markAccepted: vi.fn().mockResolvedValue(undefined),
  };
  const employeeRepository = { create: vi.fn().mockResolvedValue({ id: 'emp-1' }) };
  const clientRepository = {};
  const contactRepository = { findByClientAndEmail: vi.fn(), create: vi.fn() };
  return { repository, inviteRepository, employeeRepository, clientRepository, contactRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new UserService(
    deps.repository as never,
    deps.inviteRepository as never,
    deps.employeeRepository as never,
    deps.clientRepository as never,
    deps.contactRepository as never,
  );
}

describe('UserService.acceptInvite', () => {
  it('creates an EmployeeProfile for a staff-role invite (e.g. EMPLOYEE, RECRUITER, FINANCE)', async () => {
    for (const role of ['EMPLOYEE', 'RECRUITER', 'FINANCE']) {
      const deps = makeDeps({ role });
      await build(deps).acceptInvite({ token: 'raw-token', password: 'CorrectPassword123', firstName: 'Ada', lastName: 'Lovelace' });
      expect(deps.employeeRepository.create).toHaveBeenCalledOnce();
    }
  });

  it('does not create an EmployeeProfile for a CANDIDATE-role invite — no candidate portal exists yet', async () => {
    const deps = makeDeps({ role: 'CANDIDATE' });
    await build(deps).acceptInvite({ token: 'raw-token', password: 'CorrectPassword123', firstName: 'Cara', lastName: 'Candidate' });
    expect(deps.employeeRepository.create).not.toHaveBeenCalled();
    expect(deps.contactRepository.create).not.toHaveBeenCalled();
  });

  it('creates a ClientContact, not an EmployeeProfile, for a CLIENT-role invite', async () => {
    const deps = makeDeps({ role: 'CLIENT' }, 'client-1');
    await build(deps).acceptInvite({ token: 'raw-token', password: 'CorrectPassword123', firstName: 'Cory', lastName: 'Client' });
    expect(deps.employeeRepository.create).not.toHaveBeenCalled();
    expect(deps.contactRepository.create).toHaveBeenCalledOnce();
  });
});
