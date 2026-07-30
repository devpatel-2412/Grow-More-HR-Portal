import { describe, it, expect, vi } from 'vitest';
import { CrmService, canTransitionLead } from './crm.service.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    tenantId: 'tenant-1',
    companyName: 'Globex',
    contactName: 'Hank',
    email: 'hank@globex.com',
    phone: null,
    status: 'NEW',
    estimatedValue: 5000,
    convertedClientId: null,
    ...overrides,
  };
}

function makeDeps() {
  const leadRepository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(makeLead()),
    findByEmail: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeLead(), id, ...data })),
    delete: vi.fn(),
    findMany: vi.fn(),
    summarise: vi.fn(),
    convert: vi.fn().mockResolvedValue({ id: 'client-1' }),
  };
  const clientRepository = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue({ id: 'client-1', tenantId: 'tenant-1' }),
    findByEmail: vi.fn().mockResolvedValue(null),
    findWithDetail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  };
  const contactRepository = {
    create: vi.fn().mockResolvedValue({ id: 'contact-1' }),
    findById: vi.fn(),
    delete: vi.fn(),
    findByClientAndEmail: vi.fn().mockResolvedValue(null),
    setPrimary: vi.fn(),
  };
  const activityRepository = { create: vi.fn().mockResolvedValue({ id: 'act-1' }), findMany: vi.fn() };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }),
  };
  return { leadRepository, clientRepository, contactRepository, activityRepository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new CrmService(
    deps.leadRepository as never,
    deps.clientRepository as never,
    deps.contactRepository as never,
    deps.activityRepository as never,
    deps.employeeRepository as never,
  );
}

describe('canTransitionLead — sales funnel', () => {
  it('advances one stage at a time', () => {
    expect(canTransitionLead('NEW', 'CONTACTED')).toBe(true);
    expect(canTransitionLead('CONTACTED', 'QUALIFIED')).toBe(true);
    expect(canTransitionLead('QUALIFIED', 'PROPOSAL')).toBe(true);
  });

  it('refuses to skip stages', () => {
    expect(canTransitionLead('NEW', 'PROPOSAL')).toBe(false);
    expect(canTransitionLead('CONTACTED', 'PROPOSAL')).toBe(false);
  });

  it('never reaches WON by a plain stage change — conversion is the only route', () => {
    for (const stage of ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'] as const) {
      expect(canTransitionLead(stage, 'WON')).toBe(false);
    }
  });

  it('allows LOST from any live stage', () => {
    for (const stage of ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'] as const) {
      expect(canTransitionLead(stage, 'LOST')).toBe(true);
    }
  });

  it('treats WON and LOST as terminal', () => {
    expect(canTransitionLead('WON', 'CONTACTED')).toBe(false);
    expect(canTransitionLead('LOST', 'NEW')).toBe(false);
  });
});

describe('CrmService.changeLeadStage', () => {
  it('rejects marking a lead won directly', async () => {
    const deps = makeDeps();
    await expect(build(deps).changeLeadStage('tenant-1', 'lead-1', 'WON', undefined, {})).rejects.toThrow(
      /converting it to a client/i,
    );
  });

  it('stores a reason when a lead is lost', async () => {
    const deps = makeDeps();
    await build(deps).changeLeadStage('tenant-1', 'lead-1', 'LOST', 'Chose a competitor', {});
    expect(deps.leadRepository.update).toHaveBeenCalledWith('lead-1', {
      status: 'LOST',
      lostReason: 'Chose a competitor',
    });
  });

  it('clears a stale lost reason on a forward move', async () => {
    const deps = makeDeps();
    await build(deps).changeLeadStage('tenant-1', 'lead-1', 'CONTACTED', undefined, {});
    expect(deps.leadRepository.update).toHaveBeenCalledWith('lead-1', { status: 'CONTACTED', lostReason: null });
  });

  it('404s a lead from another tenant', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ tenantId: 'other' }));
    await expect(build(deps).changeLeadStage('tenant-1', 'lead-1', 'CONTACTED', undefined, {})).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('CrmService.convertLead', () => {
  it('only converts from the proposal stage', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'QUALIFIED' }));
    await expect(build(deps).convertLead('tenant-1', 'lead-1', {}, {})).rejects.toThrow(ConflictError);
  });

  it('refuses to convert a lost lead', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'LOST' }));
    await expect(build(deps).convertLead('tenant-1', 'lead-1', {}, {})).rejects.toThrow(ConflictError);
  });

  it('refuses to convert the same lead twice', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'PROPOSAL', convertedClientId: 'client-9' }));
    await expect(build(deps).convertLead('tenant-1', 'lead-1', {}, {})).rejects.toThrow(/already been converted/i);
  });

  it('refuses when a client already holds that contact email', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'PROPOSAL' }));
    deps.clientRepository.findByEmail.mockResolvedValue({ id: 'client-existing' });
    await expect(build(deps).convertLead('tenant-1', 'lead-1', {}, {})).rejects.toThrow(ConflictError);
  });

  it('carries the lead details onto the new client', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'PROPOSAL', phone: '+1 555 0100' }));

    await build(deps).convertLead('tenant-1', 'lead-1', { industry: 'Manufacturing' }, {});

    const [leadId, client] = deps.leadRepository.convert.mock.calls[0];
    expect(leadId).toBe('lead-1');
    expect(client).toMatchObject({
      companyName: 'Globex',
      contactEmail: 'hank@globex.com',
      phone: '+1 555 0100',
      industry: 'Manufacturing',
      status: 'ACTIVE',
    });
  });
});

describe('CrmService.createLead', () => {
  it('refuses a duplicate lead email within the tenant', async () => {
    const deps = makeDeps();
    deps.leadRepository.findByEmail.mockResolvedValue(makeLead());
    await expect(
      build(deps).createLead(
        'tenant-1',
        { companyName: 'Globex', contactName: 'Hank', email: 'hank@globex.com', estimatedValue: 0 },
        {},
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('404s an owner belonging to another tenant', async () => {
    const deps = makeDeps();
    deps.employeeRepository.findById.mockResolvedValue({ id: 'emp-1', tenantId: 'other' });
    await expect(
      build(deps).createLead(
        'tenant-1',
        { companyName: 'Globex', contactName: 'Hank', email: 'hank@globex.com', estimatedValue: 0, ownerId: 'emp-1' },
        {},
      ),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('CrmService.addContact', () => {
  it('refuses a duplicate contact email on the same client', async () => {
    const deps = makeDeps();
    deps.contactRepository.findByClientAndEmail.mockResolvedValue({ id: 'contact-existing' });
    await expect(
      build(deps).addContact('tenant-1', 'client-1', { name: 'Sam', email: 'sam@globex.com', isPrimary: false }, {}),
    ).rejects.toThrow(ConflictError);
  });

  it('demotes other contacts when a new primary is added', async () => {
    const deps = makeDeps();
    await build(deps).addContact('tenant-1', 'client-1', { name: 'Sam', email: 'sam@globex.com', isPrimary: true }, {});
    expect(deps.contactRepository.setPrimary).toHaveBeenCalledWith('client-1', 'contact-1');
  });

  it('leaves primaries alone for a non-primary contact', async () => {
    const deps = makeDeps();
    await build(deps).addContact('tenant-1', 'client-1', { name: 'Sam', email: 'sam@globex.com', isPrimary: false }, {});
    expect(deps.contactRepository.setPrimary).not.toHaveBeenCalled();
  });
});
