import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantService } from './tenant.service.js';

const { auditRecord, emailSend, seedSystemRolesForTenant } = vi.hoisted(() => ({
  auditRecord: vi.fn().mockResolvedValue(undefined),
  emailSend: vi.fn().mockResolvedValue(undefined),
  seedSystemRolesForTenant: vi.fn().mockResolvedValue({ created: [], skipped: [] }),
}));
vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: auditRecord } }));
vi.mock('../../shared/email/email.service.js', () => ({ emailService: { send: emailSend } }));
vi.mock('../rbac/rbac-seed.util.js', () => ({ seedSystemRolesForTenant }));

function makeDeps() {
  const repository = {
    findByDomain: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'tenant-1', name: 'Acme Inc', domain: 'acme' }),
  };
  const userRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'admin-user-1' }),
  };
  const inviteRepository = {
    create: vi.fn().mockResolvedValue({ id: 'invite-1' }),
  };
  return { repository, userRepository, inviteRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new TenantService(deps.repository as never, deps.userRepository as never, deps.inviteRepository as never);
}

const validInput = {
  name: 'Acme Inc',
  domain: 'acme',
  adminEmail: 'admin@acme.com',
  adminFirstName: 'Ada',
  adminLastName: 'Admin',
};

beforeEach(() => {
  vi.clearAllMocks();
  auditRecord.mockResolvedValue(undefined);
  emailSend.mockResolvedValue(undefined);
  seedSystemRolesForTenant.mockResolvedValue({ created: [], skipped: [] });
});

describe('TenantService.create — company + first admin provisioning', () => {
  it('rejects when the domain is already taken', async () => {
    const deps = makeDeps();
    deps.repository.findByDomain.mockResolvedValue({ id: 'existing-tenant' });

    await expect(build(deps).create(validInput)).rejects.toThrow(/domain already exists/i);
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('rejects when the admin email already belongs to an account', async () => {
    const deps = makeDeps();
    deps.userRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(build(deps).create(validInput)).rejects.toThrow(/account with this email already exists/i);
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('creates the tenant, a PENDING_INVITE ADMIN, and an invite, then emails the admin', async () => {
    const deps = makeDeps();

    const tenant = await build(deps).create(validInput);

    expect(deps.repository.create).toHaveBeenCalledOnce();
    expect(deps.userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@acme.com', role: 'ADMIN', status: 'PENDING_INVITE' }),
    );
    expect(deps.inviteRepository.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'admin@acme.com', role: 'ADMIN' }));
    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@acme.com', template: 'company_admin_invite' }));
    expect(tenant.id).toBe('tenant-1');
  });

  it('records both TENANT_CREATED and COMPANY_ADMIN_INVITED audit entries', async () => {
    const deps = makeDeps();

    await build(deps).create(validInput);

    const actions = auditRecord.mock.calls.map(([call]) => call.action);
    expect(actions).toContain('TENANT_CREATED');
    expect(actions).toContain('COMPANY_ADMIN_INVITED');
  });

  it('still returns the tenant even if sending the activation email fails', async () => {
    const deps = makeDeps();
    emailSend.mockRejectedValue(new Error('smtp down'));

    const tenant = await build(deps).create(validInput);

    expect(tenant.id).toBe('tenant-1');
  });
});
