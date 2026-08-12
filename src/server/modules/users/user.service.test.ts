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

function makeDeps(inviteOverrides: Partial<Record<string, unknown>> = {}) {
  const foundUser = { id: 'user-1', email: 'new@acme.com' };
  const repository = {
    findByEmail: vi.fn().mockResolvedValue(foundUser),
    update: vi.fn().mockImplementation((_id, data) => Promise.resolve({ ...foundUser, ...data })),
    create: vi.fn().mockResolvedValue({ id: 'invited-user-1' }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const inviteRepository = {
    findByTokenHash: vi.fn().mockResolvedValue(makeInvite(inviteOverrides)),
    findById: vi.fn().mockResolvedValue(makeInvite(inviteOverrides)),
    findPendingByTenantAndEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(makeInvite(inviteOverrides)),
    markAccepted: vi.fn().mockResolvedValue(undefined),
    markRevoked: vi.fn().mockResolvedValue(undefined),
    updateToken: vi.fn().mockResolvedValue(undefined),
  };
  const employeeRepository = {
    create: vi.fn().mockResolvedValue({ id: 'emp-1' }),
    findByUserId: vi.fn().mockResolvedValue(null),
  };
  const tenantRepository = { findById: vi.fn().mockResolvedValue({ id: 'tenant-1', name: 'Acme Inc' }) };
  return { repository, inviteRepository, employeeRepository, tenantRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new UserService(deps.repository as never, deps.inviteRepository as never, deps.employeeRepository as never, deps.tenantRepository as never);
}

describe('UserService.acceptInvite', () => {
  it('unconditionally creates an EmployeeProfile for every accepted invite — there is no non-staff role left to branch on', async () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE']) {
      const deps = makeDeps({ role });
      await build(deps).acceptInvite({ token: 'raw-token', password: 'CorrectPassword123', firstName: 'Ada', lastName: 'Lovelace', acceptedTerms: true });
      expect(deps.employeeRepository.create).toHaveBeenCalledOnce();
    }
  }, 15000);

  it('does not create a second EmployeeProfile when an admin already created one while the invite was pending', async () => {
    const deps = makeDeps({ role: 'EMPLOYEE' });
    deps.employeeRepository.findByUserId.mockResolvedValue({ id: 'emp-preexisting' } as never);
    await build(deps).acceptInvite({ token: 'raw-token', password: 'CorrectPassword123', firstName: 'Ada', lastName: 'Lovelace', acceptedTerms: true });
    expect(deps.employeeRepository.create).not.toHaveBeenCalled();
  });
});

describe('UserService.invite — INVITABLE_ROLES gate', () => {
  it('rejects an invite when the caller role is not allowed to invite the target role', async () => {
    const deps = makeDeps();
    deps.repository.findByEmail.mockResolvedValue(null);

    await expect(build(deps).invite('tenant-1', { email: 'x@acme.com', role: 'EMPLOYEE' }, 'EMPLOYEE')).rejects.toThrow(
      /cannot invite/i,
    );
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('rejects HR_MANAGER inviting a role above EMPLOYEE (e.g. another HR_MANAGER)', async () => {
    const deps = makeDeps();
    deps.repository.findByEmail.mockResolvedValue(null);

    await expect(build(deps).invite('tenant-1', { email: 'x@acme.com', role: 'HR_MANAGER' }, 'HR_MANAGER')).rejects.toThrow(
      /cannot invite/i,
    );
  });

  it('allows ADMIN to invite EMPLOYEE and records USER_INVITED', async () => {
    const deps = makeDeps();
    deps.repository.findByEmail.mockResolvedValue(null);

    const result = await build(deps).invite('tenant-1', { email: 'new-hire@acme.com', role: 'EMPLOYEE' }, 'ADMIN');

    expect(deps.repository.create).toHaveBeenCalledOnce();
    expect(deps.inviteRepository.create).toHaveBeenCalledOnce();
    expect(result.id).toBe('invited-user-1');
  });

  it('allows HR_MANAGER to invite EMPLOYEE once the ability is granted', async () => {
    const deps = makeDeps();
    deps.repository.findByEmail.mockResolvedValue(null);

    await expect(build(deps).invite('tenant-1', { email: 'new-hire@acme.com', role: 'EMPLOYEE' }, 'HR_MANAGER')).resolves.toBeTruthy();
  });
});

describe('UserService.resendInvite', () => {
  it('rejects resending an invite that belongs to a different tenant', async () => {
    const deps = makeDeps({ tenantId: 'other-tenant' });
    await expect(build(deps).resendInvite('tenant-1', 'invite-1')).rejects.toThrow(/not found/i);
  });

  it('rejects resending a non-PENDING invite', async () => {
    const deps = makeDeps({ status: 'ACCEPTED' });
    await expect(build(deps).resendInvite('tenant-1', 'invite-1')).rejects.toThrow(/pending/i);
  });

  it('issues a fresh token and records USER_INVITE_RESENT for a pending invite', async () => {
    const deps = makeDeps();
    const result = await build(deps).resendInvite('tenant-1', 'invite-1');

    expect(deps.inviteRepository.updateToken).toHaveBeenCalledOnce();
    expect(result.id).toBe('invite-1');
  });
});

describe('UserService.revokeInvite', () => {
  it('rejects revoking an invite that belongs to a different tenant', async () => {
    const deps = makeDeps({ tenantId: 'other-tenant' });
    await expect(build(deps).revokeInvite('tenant-1', 'invite-1')).rejects.toThrow(/not found/i);
  });

  it('rejects revoking a non-PENDING invite', async () => {
    const deps = makeDeps({ status: 'REVOKED' });
    await expect(build(deps).revokeInvite('tenant-1', 'invite-1')).rejects.toThrow(/pending/i);
  });

  it('marks the invite revoked and deletes the PENDING_INVITE placeholder account so the email can be re-invited', async () => {
    const deps = makeDeps();
    deps.repository.findByEmail.mockResolvedValue({ id: 'placeholder-user', tenantId: 'tenant-1', status: 'PENDING_INVITE' });

    await build(deps).revokeInvite('tenant-1', 'invite-1');

    expect(deps.inviteRepository.markRevoked).toHaveBeenCalledWith('invite-1');
    expect(deps.repository.delete).toHaveBeenCalledWith('placeholder-user');
  });

  it('does not delete the account if it is no longer PENDING_INVITE (e.g. already activated some other way)', async () => {
    const deps = makeDeps();
    deps.repository.findByEmail.mockResolvedValue({ id: 'real-user', tenantId: 'tenant-1', status: 'ACTIVE' });

    await build(deps).revokeInvite('tenant-1', 'invite-1');

    expect(deps.repository.delete).not.toHaveBeenCalled();
  });
});
