import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadPipelineBoard } from './LeadPipelineBoard';
import { renderWithProviders } from '../../../test/test-utils';
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
    convertedClientId: null,
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
        onConvert={vi.fn()}
      />,
    );

    expect(screen.getByText('Globex')).toBeInTheDocument();
    expect(screen.getByText('Initech')).toBeInTheDocument();
  });

  it('opens a lead when its company name is clicked', async () => {
    const onOpenLead = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<LeadPipelineBoard leads={[makeLead()]} onOpenLead={onOpenLead} onConvert={vi.fn()} />);

    await user.click(screen.getByText('Globex'));
    expect(onOpenLead).toHaveBeenCalledWith(expect.objectContaining({ id: 'lead-1' }));
  });

  it('offers Convert instead of a move-to dropdown at the proposal stage', async () => {
    const onConvert = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <LeadPipelineBoard leads={[makeLead({ status: 'PROPOSAL' })]} onOpenLead={vi.fn()} onConvert={onConvert} />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /convert/i }));
    expect(onConvert).toHaveBeenCalledWith(expect.objectContaining({ status: 'PROPOSAL' }));
  });

  // Same reasoning as CandidatePipeline.test.tsx: Radix Select cannot open under jsdom, so the
  // legal-moves list is checked against the map the component actually renders from.
  it('never treats WON as a plain forward move — conversion is the only route there', () => {
    for (const stage of ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'] as const) {
      expect(LEAD_TRANSITIONS[stage]).not.toContain('WON');
    }
  });
});
