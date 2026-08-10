import { describe, it, expect, vi } from 'vitest';
import { CrmService, canTransitionLead } from './crm.service.js';
import { auditLogService } from '../audit/audit.service.js';
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
  };
  const activityRepository = { create: vi.fn().mockResolvedValue({ id: 'act-1' }), findMany: vi.fn() };
  const employeeRepository = {
    findById: vi.fn().mockResolvedValue({ id: 'emp-1', tenantId: 'tenant-1' }),
    findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }),
  };
  return { leadRepository, activityRepository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new CrmService(deps.leadRepository as never, deps.activityRepository as never, deps.employeeRepository as never);
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

  it('reaches WON only directly from PROPOSAL', () => {
    expect(canTransitionLead('PROPOSAL', 'WON')).toBe(true);
    for (const stage of ['NEW', 'CONTACTED', 'QUALIFIED'] as const) {
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
  it('wins a lead directly from PROPOSAL and logs it as LEAD_CONVERTED', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'PROPOSAL' }));
    await build(deps).changeLeadStage('tenant-1', 'lead-1', 'WON', undefined, {});
    expect(deps.leadRepository.update).toHaveBeenCalledWith('lead-1', { status: 'WON', lostReason: null });
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAD_CONVERTED' }));
  });

  it('refuses to win a lead that is not yet at the proposal stage', async () => {
    const deps = makeDeps();
    deps.leadRepository.findById.mockResolvedValue(makeLead({ status: 'QUALIFIED' }));
    await expect(build(deps).changeLeadStage('tenant-1', 'lead-1', 'WON', undefined, {})).rejects.toThrow(ConflictError);
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
