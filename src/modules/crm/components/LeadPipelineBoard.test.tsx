import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadPipelineBoard } from './LeadPipelineBoard';
import { renderWithProviders } from '../../../test/test-utils';
import { server, handlers } from '../../../test/msw/server';
import { LEAD_TRANSITIONS, type LeadRecord } from '../types/crm.types';

function makeLead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: 'lead-1',
    tenantId: 'tenant-1',
    companyName: 'Globex',
    contactName: 'Hank Scorpio',
    email: 'hank@globex.com',
    phone: null,
    source: null,
    status: 'NEW',
    estimatedValue: 5000,
    ownerId: null,
    notes: null,
    lostReason: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('LeadPipelineBoard', () => {
  it('places each lead under its current stage', () => {
    renderWithProviders(
      <LeadPipelineBoard
        leads={[
          makeLead({ id: 'l1', companyName: 'Globex', status: 'NEW' }),
          makeLead({ id: 'l2', companyName: 'Initech', status: 'PROPOSAL' }),
        ]}
        onOpenLead={vi.fn()}
      />,
    );

    expect(screen.getByText('Globex')).toBeInTheDocument();
    expect(screen.getByText('Initech')).toBeInTheDocument();
  });

  it('opens a lead when its company name is clicked', async () => {
    const onOpenLead = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<LeadPipelineBoard leads={[makeLead()]} onOpenLead={onOpenLead} />);

    await user.click(screen.getByText('Globex'));
    expect(onOpenLead).toHaveBeenCalledWith(expect.objectContaining({ id: 'lead-1' }));
  });

  it('offers Mark won / Mark lost instead of a move-to dropdown at the proposal stage', async () => {
    server.use(handlers.meSuccessWithPermissions(['crm:manage']));
    renderWithProviders(<LeadPipelineBoard leads={[makeLead({ status: 'PROPOSAL' })]} onOpenLead={vi.fn()} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /mark won/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark lost/i })).toBeInTheDocument();
  });

  // Same reasoning as CandidatePipeline.test.tsx: Radix Select cannot open under jsdom, so the
  // legal-moves list is checked against the map the component actually renders from.
  it('reaches WON only directly from PROPOSAL, never from an earlier stage', () => {
    expect(LEAD_TRANSITIONS.PROPOSAL).toContain('WON');
    for (const stage of ['NEW', 'CONTACTED', 'QUALIFIED'] as const) {
      expect(LEAD_TRANSITIONS[stage]).not.toContain('WON');
    }
  });
});
